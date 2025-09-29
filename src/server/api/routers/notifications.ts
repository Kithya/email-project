import z from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import crypto from "crypto";
import { db } from "~/server/db";

export const notificationRouter = createTRPCRouter({
  getTelegramDeepLink: privateProcedure
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      const userId = ctx.auth.userId;
      const token = crypto.randomBytes(16).toString("hex");
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await db.userNotificationSettings.upsert({
        where: { userId },
        update: { pendingLinkToken: token, pendingLinkExpires: expires },
        create: {
          userId,
          pendingLinkToken: token,
          pendingLinkExpires: expires,
        },
      });
      const botUser = process.env.TELEGRAM_BOT_USERNAME || ""; // optional
      const link = `https://t.me/${botUser}?start=${token}`;
      return { link, expiresAt: expires };
    }),
});
