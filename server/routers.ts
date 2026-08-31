import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createReviewRequest, getImpactMetrics, getReminderPreferences, listEducationalContent, listLegalTemplates, listPlansForUser, listReviewRequests, recordDonation, saveEducationalContent, saveLegalTemplate, saveReminderPreferences, updateReviewRequestStatus, upsertPlanProgress } from "./db";
import Stripe from "stripe";

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
  reviews: router({
    request: protectedProcedure.input(z.object({ planId: z.number().int().positive(), reason: z.string().min(1).max(2000) })).mutation(({ ctx, input }) => createReviewRequest(ctx.user.id, input.planId, input.reason)),
    list: adminProcedure.query(() => listReviewRequests()),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["queued", "assigned", "completed", "closed"]) })).mutation(({ input }) => updateReviewRequestStatus(input.id, input.status)),
  }),
  impact: router({
    metrics: adminProcedure.query(() => getImpactMetrics()),
  }),
  content: router({
    templates: adminProcedure.query(() => listLegalTemplates()),
    saveTemplate: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), title: z.string().min(1).max(180), kind: z.enum(["will", "prenup"]), status: z.enum(["draft", "review", "approved", "archived"]), body: z.string().optional() })).mutation(({ input }) => saveLegalTemplate(input)),
    education: adminProcedure.query(() => listEducationalContent()),
    saveEducation: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), title: z.string().min(1).max(180), slug: z.string().min(1).max(180), locale: z.string().min(2).max(10), status: z.enum(["draft", "published", "archived"]), body: z.string().optional() })).mutation(({ input }) => saveEducationalContent(input)),
  }),
  donations: router({
    createCheckout: publicProcedure.input(z.object({ amountCents: z.number().int().min(500).max(100000) })).mutation(async ({ ctx, input }) => {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      const origin = ctx.req.headers.origin || "http://localhost";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: ctx.user?.email || undefined,
        client_reference_id: ctx.user ? String(ctx.user.id) : undefined,
        metadata: { user_id: ctx.user ? String(ctx.user.id) : "", customer_email: ctx.user?.email || "", customer_name: ctx.user?.name || "" },
        allow_promotion_codes: true,
        line_items: [{ price_data: { currency: "cad", product_data: { name: "Legacyloom nonprofit donation" }, unit_amount: input.amountCents }, quantity: 1 }],
        success_url: `${origin}/donate?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/donate?canceled=1`,
      });
      return { url: session.url };
    }),
    confirm: publicProcedure.input(z.object({ sessionId: z.string().min(1) })).query(async ({ input }) => {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      const session = await stripe.checkout.sessions.retrieve(input.sessionId);
      if (session.payment_status !== "paid") return { paid: false };
      const userId = session.metadata?.user_id ? Number(session.metadata.user_id) : null;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
      await recordDonation(Number.isFinite(userId) ? userId : null, paymentIntentId);
      return { paid: true };
    }),
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
