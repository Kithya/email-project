export const runtime = "nodejs";
import z from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { db } from "~/server/db";
import type { Prisma } from "@prisma/client";
import { emailAddressSchema } from "~/types";
import { Account } from "~/lib/account";
import { OramaClient } from "~/lib/orama";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { correlationKey } from "~/lib/email-correlation";
import { getAttachmentInsightsForThread } from "~/lib/attachment-extractor";
import { notifyFollowups } from "~/lib/notify-followup";
import { FREE_CREDITS_PER_DAY } from "~/lib/data";

export const authoriseAccountAccess = async (
  accountId: string,
  userId: string,
) => {
  const account = await db.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
    select: {
      id: true,
      emailAddress: true,
      name: true,
      accessToken: true,
    },
  });

  if (!account) throw new Error("Unauthorized access to account");
  return account;
};

// module-scope throttle map
const syncingByAccount = new Map<string, Promise<void>>();
const lastSyncAt = new Map<string, number>();

async function throttledSync(
  accountId: string,
  token: string,
  minIntervalMs = 90_000,
) {
  const now = Date.now();
  const last = lastSyncAt.get(accountId) || 0;
  if (now - last < minIntervalMs) return; // too soon

  if (syncingByAccount.has(accountId)) return;

  const task = (async () => {
    try {
      const acc = new Account(token);
      await acc.syncEmails();
      lastSyncAt.set(accountId, Date.now());
    } catch (e) {
      console.error("throttledSync error", e);
    } finally {
      syncingByAccount.delete(accountId);
    }
  })();

  syncingByAccount.set(accountId, task);
}

export const accountRouter = createTRPCRouter({
  getAccount: privateProcedure.query(async ({ ctx }) => {
    return await ctx.db.account.findMany({
      where: {
        userId: ctx.auth.userId,
      },
      select: {
        id: true,
        emailAddress: true,
        name: true,
      },
    });
  }),

  getNumThreads: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
        tab: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(
        input.accountId,
        ctx.auth.userId,
      );

      let filter: Prisma.ThreadWhereInput = {};
      if (input.tab === "inbox") {
        filter.inboxStatus = true;
      } else if (input.tab === "draft") {
        filter.draftStatus = true;
      } else if (input.tab === "sent") {
        filter.sentStatus = true;
      }

      return await ctx.db.thread.count({
        where: {
          accountId: account.id,
          // inboxStatus: input.tab === "inbox" ? true : false,
          // draftStatus: input.tab === "draft" ? true : false,
          // sentStatus: input.tab === "sent" ? true : false,
          ...filter,
        },
      });
    }),

  getThreads: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
        tab: z.string(),
        done: z.boolean(),
        page: z.number().int().min(1).max(100).optional().default(15),
        pageSize: z.number().int().min(1).max(100).optional().default(15),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(
        input.accountId,
        ctx.auth.userId,
      );
      // const acc = new Account(account.accessToken);
      // acc.syncEmails().catch(console.error);
      await throttledSync(account.id, account.accessToken);

      let filter: Prisma.ThreadWhereInput = {
        accountId: account.id,
        done: { equals: input.done },
      };
      if (input.tab === "inbox") {
        filter.inboxStatus = true;
      } else if (input.tab === "draft") {
        filter.draftStatus = true;
      } else if (input.tab === "sent") {
        filter.sentStatus = true;
      }

      const total = await ctx.db.thread.count({ where: filter });
      const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
      const page = Math.min(Math.max(1, input.page), totalPages);
      const skip = (page - 1) * input.pageSize;

      // filter.done = {
      //   equals: input.done,
      // };

      //   return await ctx.db.thread.findMany({
      //     where: {
      //       accountId: account.id,
      //       ...filter,
      //     },
      //     include: {
      //       emails: {
      //         orderBy: {
      //           sentAt: "asc",
      //         },
      //         select: {
      //           from: true,
      //           body: true,
      //           subject: true,
      //           sentAt: true,
      //           id: true,
      //           bodySnippet: true,
      //           emailLabel: true,
      //           sysLabels: true,
      //         },
      //       },
      //     },
      //     take: 15,
      //     orderBy: {
      //       lastMessageDate: "desc",
      //     },
      //   });
      // }),
      const items = await ctx.db.thread.findMany({
        where: filter,
        orderBy: [{ lastMessageDate: "desc" }, { id: "desc" }],
        skip,
        take: input.pageSize,
        include: {
          emails: {
            orderBy: { sentAt: "asc" },
            select: {
              from: true,
              to: {
                select: { address: true },
              },
              body: true,
              subject: true,
              sentAt: true,
              id: true,
              bodySnippet: true,
              emailLabel: true,
              sysLabels: true,
              attachments: {
                select: {
                  id: true,
                  name: true,
                  mimeType: true,
                  size: true,
                  inline: true,
                  contentId: true,
                },
              },
            },
          },
        },
      });

      return { items, page, pageSize: input.pageSize, total, totalPages };
    }),

  getSuggestions: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(
        input.accountId,
        ctx.auth.userId,
      );
      return await ctx.db.emailAddress.findMany({
        where: {
          accountId: account.id,
        },
        select: {
          address: true,
          name: true,
        },
      });
    }),

  getReplyDetails: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
        threadId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(
        input.accountId,
        ctx.auth.userId,
      );
      const thread = await ctx.db.thread.findFirst({
        where: {
          id: input.threadId,
          accountId: account.id,
        },
        include: {
          emails: {
            orderBy: { sentAt: "asc" },
            select: {
              from: true,
              to: true,
              cc: true,
              bcc: true,
              sentAt: true,
              subject: true,
              internetMessageId: true,
            },
          },
        },
      });
      if (!thread || thread.emails.length === 0)
        throw new Error("Thread not found");

      const lastExternalEmail = thread.emails
        .reverse()
        .find((email) => email.from.address !== account.emailAddress);
      if (!lastExternalEmail) throw new Error("No external email found");

      return {
        subject: lastExternalEmail.subject,
        to: [
          lastExternalEmail.from,
          ...lastExternalEmail.to.filter(
            (to) => to.address !== account.emailAddress,
          ),
        ],
        cc: lastExternalEmail.cc.filter(
          (cc) => cc.address !== account.emailAddress,
        ),
        from: { name: account.name, address: account.emailAddress },
        id: lastExternalEmail.internetMessageId,
      };
    }),

  sendEmail: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
        body: z.string(), // HTML
        subject: z.string(),
        from: emailAddressSchema,
        cc: z.array(emailAddressSchema).optional(),
        bcc: z.array(emailAddressSchema).optional(),
        to: z.array(emailAddressSchema),

        replyTo: emailAddressSchema,
        inReplyTo: z.string().optional(),

        threadId: z.string().optional(),

        attachments: z
          .array(
            z.object({
              inline: z.boolean().optional(),
              name: z.string(),
              mimeType: z.string().optional(),
              contentId: z.string().optional(),
              content: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(
        input.accountId,
        ctx.auth.userId,
      );

      const acc = new Account(account.accessToken);

      const providerRes = await acc.sendEmail({
        body: input.body,
        subject: input.subject,
        from: input.from,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        replyTo: input.replyTo,
        inReplyTo: input.inReplyTo,
        threadId: input.threadId,
        attachments: input.attachments?.map((a) => ({
          inline: a.inline,
          name: a.name,
          mimeType: a.mimeType,
          contentId: a.contentId,
          content: a.content,
        })),
      });

      const now = new Date();
      const corrId = correlationKey({
        subject: input.subject,
        html: input.body,
        toAddresses: input.to.map((t) => t.address),
        ccAddresses: (input.cc || []).map((c) => c.address),
        fromAddress: input.from.address,
        now: now.getTime(),
      });

      const internetMessageId: string =
        providerRes?.internetMessageId ??
        providerRes?.messageId ??
        `local-${now.getTime()}-${Math.random().toString(36).slice(2)}`;

      let emailRow = await ctx.db.email.findFirst({
        where: { internetMessageId },
        select: { id: true },
      });

      if (!emailRow) {
        let threadId = input.threadId;
        if (!threadId) {
          const thread = await ctx.db.thread.create({
            data: {
              subject: input.subject || "(no subject)",
              lastMessageDate: now,
              participantIds: [],
              accountId: account.id,
              done: false,
              inboxStatus: false,
              draftStatus: false,
              sentStatus: true,
            },
            select: { id: true },
          });
          threadId = thread.id;
        }

        const fromAddr = await ctx.db.emailAddress.upsert({
          where: {
            accountId_address: {
              accountId: account.id,
              address: input.from.address,
            },
          },
          update: { name: input.from.name ?? null },
          create: {
            accountId: account.id,
            address: input.from.address,
            name: input.from.name ?? null,
          },
          select: { id: true },
        });

        emailRow = await ctx.db.email.create({
          data: {
            threadId,
            createdTime: now,
            lastModifiedTime: now,
            sentAt: now,
            receivedAt: now,
            internetMessageId,
            subject: input.subject || "(no subject)",
            sysLabels: ["sent", "local"],
            keywords: [],
            sysClassifications: [],
            sensitivity: "normal",
            fromId: fromAddr.id,
            hasAttachments: !!(input.attachments && input.attachments.length),
            body: input.body,
            bodySnippet: null,
            inReplyTo: input.inReplyTo ?? null,
            references: null,
            threadIndex: null,
            internetHeaders: [],
            nativeProperties: { clientCorrelationId: corrId },
            folderId: null,
            omitted: [],
            emailLabel: "sent",
          },
          select: { id: true },
        });
      } else {
        await ctx.db.email.update({
          where: { id: emailRow.id },
          data: {
            lastModifiedTime: now,
            body: input.body,
            hasAttachments: !!(input.attachments && input.attachments.length),
            nativeProperties: { clientCorrelationId: corrId },
            sysLabels: { set: ["sent", "local"] },
          },
        });
      }

      if (input.attachments?.length) {
        const rows = input.attachments.map((a) => ({
          name: a.name,
          mimeType: a.mimeType ?? "application/octet-stream",
          size:
            Math.floor((a.content.length * 3) / 4) -
            (a.content.endsWith("==") ? 2 : a.content.endsWith("=") ? 1 : 0),
          inline: a.inline ?? false,
          contentId: a.contentId ?? null,
          content: a.content,
          contentLocation: null,
          emailId: emailRow!.id,
        }));
        await ctx.db.emailAttachment.deleteMany({
          where: { emailId: emailRow!.id },
        });
        await ctx.db.emailAttachment.createMany({ data: rows });
      }

      try {
        const primaryTo = input.to[0]?.address;
        if (primaryTo) {
          await notifyFollowups({
            to: primaryTo,
            subject: input.subject,
            from: input.from.address,
            threadId: providerRes?.threadId ?? input.threadId,
          });
        }
      } catch (e) {
        console.error("notifyFollowup failed:", e);
      }

      return { ok: true, id: emailRow.id, internetMessageId };
    }),

  searchEmails: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
        query: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(
        input.accountId,
        ctx.auth.userId,
      );
      const orama = new OramaClient(account.id);
      await orama.initialize();
      const results = await orama.search({ term: input.query });
      return results;
    }),

  getThreadById: privateProcedure
    .input(z.object({ accountId: z.string(), threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(
        input.accountId,
        ctx.auth.userId,
      );
      return await ctx.db.thread.findFirst({
        where: { id: input.threadId, accountId: account.id },
        include: {
          emails: {
            orderBy: { sentAt: "asc" },
            select: {
              from: true,
              body: true,
              subject: true,
              sentAt: true,
              id: true,
              bodySnippet: true,
              emailLabel: true,
              sysLabels: true,
              attachments: {
                select: {
                  id: true,
                  name: true,
                  mimeType: true,
                  size: true,
                  inline: true,
                  contentId: true,
                },
              },
            },
          },
        },
      });
    }),

  getAttachmentInsights: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
        threadId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(
        input.accountId,
        ctx.auth.userId,
      );
      const t = await ctx.db.thread.findFirst({
        where: { id: input.threadId, accountId: account.id },
        select: { id: true },
      });
      if (!t) throw new Error("Thread not found");
      return await getAttachmentInsightsForThread(input.threadId, 2);
    }),
  getChatbotInteraction: privateProcedure.query(async ({ ctx }) => {
    const chatbotInteraction = await ctx.db.chatbotInteraction.findUnique({
      where: {
        day: new Date().toDateString(),
        userId: ctx.auth.userId,
      },
      select: { count: true },
    });
    const remainingCredits =
      FREE_CREDITS_PER_DAY - (chatbotInteraction?.count || 0);
    return {
      remainingCredits,
    };
  }),
});
