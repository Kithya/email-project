import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ input }) => {
      return {
        id: "demo-post",
        name: input.name,
        createdAt: new Date(),
      };
    }),

  getLatest: publicProcedure.query(() => ({
    id: "demo-post",
    name: "Demo post",
    createdAt: new Date(),
  })),
});
