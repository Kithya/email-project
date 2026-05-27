import { db } from "~/server/db";
import { NextResponse, type NextRequest } from "next/server";
import { Account } from "~/lib/account";
import { syncEmailsToDatabase } from "~/lib/sync-to-db";
import {
  ensureDemoMailboxForUser,
  isDemoAccount,
  isDemoMode,
} from "~/lib/demo-mailbox";

export const POST = async (req: NextRequest) => {
  const { accountId, userId } = await req.json();
  if (!accountId || !userId) {
    return new Response("Invalid request", { status: 400 });
  }

  const dbAccount = await db.account.findUnique({
    where: {
      id: accountId,
      userId,
    },
  });

  if (!dbAccount)
    return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (isDemoMode() || isDemoAccount(dbAccount)) {
    await ensureDemoMailboxForUser(userId);
    return NextResponse.json(
      { success: true, provider: "demo" },
      { status: 200 },
    );
  }

  if (!dbAccount.accessToken) {
    return NextResponse.json(
      { error: "Account is missing provider credentials" },
      { status: 400 },
    );
  }

  const account = new Account(dbAccount.accessToken);

  const response = await account.performInitialSync();
  if (!response) {
    return NextResponse.json(
      { error: "Failed to perform initial sync" },
      { status: 500 },
    );
  }

  const { emails, deltaToken } = response;
  console.log("emails", emails);

  await db.account.update({
    where: {
      id: accountId,
    },
    data: {
      nextDeltaToken: deltaToken,
    },
  });

  await syncEmailsToDatabase(emails, accountId);

  console.log("Sync complete", deltaToken);

  return NextResponse.json({ success: true }, { status: 200 });
};
