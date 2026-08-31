import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getReminderPreferences, listPlansForUser, saveReminderPreferences, upsertPlanProgress } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  plans: router({
    list: protectedProcedure.query(({ ctx }) => listPlansForUser(ctx.user.id)),
    save: protectedProcedure.input(z.object({
      id: z.number().optional(),
      kind: z.enum(["will", "prenup"]),
      status: z.enum(["draft", "review", "complete", "archived"]).default("draft"),
      progress: z.number().int().min(0).max(100).default(0),
      suitabilityAcknowledged: z.number().int().min(0).max(1).default(0),
      answersJson: z.string().optional(),
    })).mutation(({ ctx, input }) => upsertPlanProgress(ctx.user.id, input)),
  }),
  reminders: router({
    get: protectedProcedure.query(({ ctx }) => getReminderPreferences(ctx.user.id)),
    save: protectedProcedure.input(z.object({
      unfinishedDocuments: z.number().int().min(0).max(1),
      signingSteps: z.number().int().min(0).max(1),
      periodicReviews: z.number().int().min(0).max(1),
    })).mutation(({ ctx, input }) => saveReminderPreferences(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
