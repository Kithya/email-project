import { db } from "~/server/db";
import type {
  DateLike,
  EmailAddress,
  EmailAttachment,
  EmailMessage,
} from "~/types";
import pLimit from "p-limit";
import { OramaClient } from "./orama";
import { turndown } from "./turndown";
import { getEmbeddings } from "./embedding";
import { correlationKey } from "./email-correlation"; // 👈 NEW
import { ensureAttachmentProcessed } from "./attachment-extractor";

function toISO(input: DateLike): string {
  const d = input instanceof Date ? input : new Date(input);

  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export async function syncEmailsToDatabase(
  emails: EmailMessage[],
  accountId: string,
) {
  console.log("attempting to sync emails to database", emails.length);

  const limit = pLimit(10);

  const orama = new OramaClient(accountId);
  await orama.initialize();

  try {
    for (const email of emails) {
      const body = turndown.turndown(email.body ?? email.bodySnippet ?? "");
      const embedding = await getEmbeddings(body);
      await orama.insert({
        subject: email.subject,
        body,
        from: email.from.address,
        rawBody: email.bodySnippet ?? "",
        to: email.to.map((to) => to.address),
        sentAt: toISO(email.sentAt),
        threadId: email.threadId,
        embedding,
      });

      await upsertEmailWithReconciliation(email, accountId);
    }
  } catch (error) {
    console.error("syncEmailsToDatabase error", error);
  }
}

async function upsertEmailWithReconciliation(
  email: EmailMessage,
  accountId: string,
) {
  let emailLabelType: "inbox" | "sent" | "draft" = "inbox";
  if (
    email.sysLabels.includes("inbox") ||
    email.sysLabels.includes("important")
  ) {
    emailLabelType = "inbox";
  } else if (email.sysLabels.includes("sent")) {
    emailLabelType = "sent";
  } else if (email.sysLabels.includes("draft")) {
    emailLabelType = "draft";
  }

  // ---- addresses
  const addressesToUpsert = new Map<string, EmailAddress>();
  for (const a of [
    email.from,
    ...email.to,
    ...email.cc,
    ...email.bcc,
    ...email.replyTo,
  ]) {
    if (a?.address) addressesToUpsert.set(a.address, a);
  }
  const upserted = await Promise.all(
    [...addressesToUpsert.values()].map((a) =>
      upsertEmailAddress(a, accountId),
    ),
  );
  const addressMap = new Map(
    upserted.filter(Boolean).map((a) => [a!.address, a!]),
  );

  const fromAddress = addressMap.get(email.from.address);
  if (!fromAddress) {
    console.log(`Failed to upsert from address for ${email.internetMessageId}`);
    return;
  }
  const toAddresses = email.to
    .map((a) => addressMap.get(a.address))
    .filter(Boolean) as { id: string }[];
  const ccAddresses = email.cc
    .map((a) => addressMap.get(a.address))
    .filter(Boolean) as { id: string }[];
  const bccAddresses = email.bcc
    .map((a) => addressMap.get(a.address))
    .filter(Boolean) as { id: string }[];
  const replyToAddrs = email.replyTo
    .map((a) => addressMap.get(a.address))
    .filter(Boolean) as { id: string }[];

  const thread = await db.thread.upsert({
    where: { id: email.threadId },
    update: {
      subject: email.subject,
      accountId,
      lastMessageDate: new Date(email.sentAt),
      done: false,
      participantIds: [
        ...new Set([
          fromAddress.id,
          ...toAddresses.map((a) => a.id),
          ...ccAddresses.map((a) => a.id),
          ...bccAddresses.map((a) => a.id),
        ]),
      ],
    },
    create: {
      id: email.threadId,
      accountId,
      subject: email.subject,
      done: false,
      draftStatus: emailLabelType === "draft",
      inboxStatus: emailLabelType === "inbox",
      sentStatus: emailLabelType === "sent",
      lastMessageDate: new Date(email.sentAt),
      participantIds: [
        ...new Set([
          fromAddress.id,
          ...toAddresses.map((a) => a.id),
          ...ccAddresses.map((a) => a.id),
          ...bccAddresses.map((a) => a.id),
        ]),
      ],
    },
  });

  let existing = await db.email.findFirst({
    where: {
      internetMessageId: email.internetMessageId,
      thread: { accountId },
    },
    select: { id: true, sysLabels: true },
  });

  if (!existing) {
    try {
      const corrId = correlationKey({
        subject: email.subject || "",
        html: email.body || email.bodySnippet || "",
        toAddresses: (email.to || []).map((x) => x.address),
        ccAddresses: (email.cc || []).map((x) => x.address),
        fromAddress: email.from?.address,
        now: new Date(email.sentAt || Date.now()).getTime(),
      });
      existing = await db.email.findFirst({
        where: {
          thread: { accountId },
          nativeProperties: { path: ["clientCorrelationId"], equals: corrId },
          sysLabels: { has: "local" },
        },
        select: { id: true, sysLabels: true },
      });
    } catch {}
  }

  const baseCommon = {
    threadId: thread.id,
    createdTime: new Date(email.createdTime),
    lastModifiedTime: new Date(),
    sentAt: new Date(email.sentAt),
    receivedAt: new Date(email.receivedAt),
    internetMessageId: email.internetMessageId,
    subject: email.subject,
    keywords: email.keywords,
    sysClassifications: email.sysClassifications,
    sensitivity: email.sensitivity,
    meetingMessageMethod: email.meetingMessageMethod,
    fromId: fromAddress.id,
    hasAttachments: email.hasAttachments,
    internetHeaders: email.internetHeaders as any,
    body: email.body,
    bodySnippet: email.bodySnippet,
    inReplyTo: email.inReplyTo,
    references: email.references,
    threadIndex: email.threadIndex,
    nativeProperties: email.nativeProperties as any,
    folderId: email.folderId,
    omitted: email.omitted,
    emailLabel: emailLabelType,
  };

  const updateData = {
    ...baseCommon,
    sysLabels: (existing?.sysLabels || email.sysLabels || []).filter(
      (s) => s !== "local",
    ),
    to: { set: toAddresses.map((a) => ({ id: a.id })) },
    cc: { set: ccAddresses.map((a) => ({ id: a.id })) },
    bcc: { set: bccAddresses.map((a) => ({ id: a.id })) },
    replyTo: { set: replyToAddrs.map((a) => ({ id: a.id })) },
  } satisfies Parameters<typeof db.email.update>[0]["data"];

  const createData = {
    ...baseCommon,
    sysLabels: email.sysLabels,
    to: { connect: toAddresses.map((a) => ({ id: a.id })) },
    cc: { connect: ccAddresses.map((a) => ({ id: a.id })) },
    bcc: { connect: bccAddresses.map((a) => ({ id: a.id })) },
    replyTo: { connect: replyToAddrs.map((a) => ({ id: a.id })) },
  } satisfies Parameters<typeof db.email.create>[0]["data"];

  let targetEmailId: string;

  if (existing) {
    await db.email.update({ where: { id: existing.id }, data: updateData });
    targetEmailId = existing.id;
  } else {
    const created = await db.email.create({
      data: { id: email.id, ...createData },
      select: { id: true },
    });
    targetEmailId = created.id;
  }

  const threadEmails = await db.email.findMany({
    where: { threadId: thread.id },
    orderBy: { receivedAt: "asc" },
    select: { emailLabel: true },
  });
  let threadFolderType: "inbox" | "draft" | "sent" = "sent";
  for (const te of threadEmails) {
    if (te.emailLabel === "inbox") {
      threadFolderType = "inbox";
      break;
    }
    if (te.emailLabel === "draft") threadFolderType = "draft";
  }
  await db.thread.update({
    where: { id: thread.id },
    data: {
      draftStatus: threadFolderType === "draft",
      inboxStatus: threadFolderType === "inbox",
      sentStatus: threadFolderType === "sent",
    },
  });

  if (email.attachments?.length) {
    for (const att of email.attachments) {
      await upsertAttachment(targetEmailId, att);
    }

    const limiter = pLimit(5);
    await Promise.all(
      email.attachments.map((att) =>
        limiter(async () => {
          if (!att.id) return;
          const mime = (att.mimeType || "").toLowerCase();
          if (
            mime.includes("pdf") ||
            mime.includes("officedocument.wordprocessingml.document") ||
            att.name?.toLowerCase().endsWith(".pdf") ||
            att.name?.toLowerCase().endsWith(".docx")
          ) {
            await ensureAttachmentProcessed(att.id);
          }
        }),
      ),
    );
  }
}

async function upsertEmailAddress(address: EmailAddress, accountId: string) {
  try {
    const existingAddress = await db.emailAddress.findUnique({
      where: {
        accountId_address: {
          accountId,
          address: address.address ?? "",
        },
      },
    });

    if (existingAddress) {
      return existingAddress;
    } else {
      return await db.emailAddress.create({
        data: {
          address: address.address ?? "",
          name: address.name,
          raw: address.raw,
          accountId,
        },
      });
    }
  } catch (error) {
    console.log(`Failed to upsert email address: ${error}`);
    return null;
  }
}

async function upsertAttachment(emailId: string, attachment: EmailAttachment) {
  try {
    if (attachment.id) {
      await db.emailAttachment.upsert({
        where: { id: attachment.id },
        update: {
          emailId,
          name: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size,
          inline: attachment.inline,
          contentId: attachment.contentId,
          content: attachment.content, // base64 if provider gave bytes
          contentLocation: attachment.contentLocation, // or a provider URL
        },
        create: {
          id: attachment.id,
          emailId,
          name: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size,
          inline: attachment.inline,
          contentId: attachment.contentId,
          content: attachment.content,
          contentLocation: attachment.contentLocation,
        },
      });
      return;
    }

    const maybeExisting = await db.emailAttachment.findFirst({
      where: {
        emailId,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        inline: attachment.inline ?? false,
        contentId: attachment.contentId ?? null,
      },
      select: { id: true },
    });

    if (maybeExisting) {
      await db.emailAttachment.update({
        where: { id: maybeExisting.id },
        data: {
          content: attachment.content ?? undefined,
          contentLocation: attachment.contentLocation ?? undefined,
        },
      });
    } else {
      await db.emailAttachment.create({
        data: {
          emailId,
          name: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size,
          inline: attachment.inline ?? false,
          contentId: attachment.contentId ?? null,
          content: attachment.content,
          contentLocation: attachment.contentLocation,
        },
      });
    }
  } catch (error) {
    console.log(`Failed to upsert attachment for email ${emailId}: ${error}`);
  }
}
