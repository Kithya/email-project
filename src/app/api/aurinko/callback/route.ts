// /api/aurinko/callback

import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import axios from "axios";
import { exchageCodeForAccessToken, getAccountDetails } from "~/lib/aurinko";

export const GET = async (req: NextRequest) => {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 },
    );
  console.log("Aurinko Callback received", userId);

  const params = req.nextUrl.searchParams;
  const status = params.get("status");

  if (status != "success")
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 400 },
    );

  //   get code to exchange for access token
  const code = params.get("code");
  if (!code)
    return NextResponse.json({ message: "No code found" }, { status: 401 });

  const token = await exchageCodeForAccessToken(code);
  if (!token)
    return NextResponse.json({ error: "Failed to exchange code for token" });

  const accountDetails = await getAccountDetails(token.accessToken);

  await db.account.upsert({
    where: { id: token.accountId.toString() },
    update: {
      accessToken: token.accessToken,
    },
    create: {
      id: token.accountId.toString(),
      userId,
      emailAddress: accountDetails.email,
      name: accountDetails.name,
      accessToken: token.accessToken,
    },
  });

  //   // Trigger initial sync
  waitUntil(
    axios
      .post(`${process.env.NEXT_PUBLIC_URL}/api/initial-sync`, {
        accountId: token.accountId.toString(),
        userId,
      })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err.response.data);
      }),
  );

  return NextResponse.redirect(new URL("/mail", req.url));
};
