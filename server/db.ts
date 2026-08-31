import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, donations, educationalContent, legalTemplates, plans, reviewRequests, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.


import { and, desc } from "drizzle-orm";
import { InsertPlan, Plan, reminderPreferences } from "../drizzle/schema";

export async function listPlansForUser(userId: number): Promise<Plan[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plans).where(eq(plans.userId, userId)).orderBy(desc(plans.updatedAt));
}

export async function upsertPlanProgress(userId: number, input: Omit<InsertPlan, "userId"> & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.id) {
    const owned = await db.select().from(plans).where(and(eq(plans.id, input.id), eq(plans.userId, userId))).limit(1);
    if (!owned[0]) throw new Error("Plan not found");
    await db.update(plans).set({ kind: input.kind, status: input.status, progress: input.progress, suitabilityAcknowledged: input.suitabilityAcknowledged, answersJson: input.answersJson }).where(eq(plans.id, input.id));
    return { ...owned[0], ...input, userId };
  }
  const result = await db.insert(plans).values({ ...input, userId });
  return { id: Number(result[0].insertId), ...input, userId };
}

export async function getReminderPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, userId)).limit(1);
  return result[0];
}

export async function saveReminderPreferences(userId: number, input: Pick<typeof reminderPreferences.$inferInsert, "unfinishedDocuments" | "signingSteps" | "periodicReviews">) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(reminderPreferences).values({ userId, ...input }).onDuplicateKeyUpdate({ set: input });
  return getReminderPreferences(userId);
}



export async function createReviewRequest(userId: number, planId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(reviewRequests).values({ userId, planId, reason, status: "queued" });
  return { id: Number(result[0].insertId), userId, planId, reason, status: "queued" as const };
}


export async function listReviewRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewRequests).limit(100);
}

export async function updateReviewRequestStatus(id: number, status: "queued" | "assigned" | "completed" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(reviewRequests).set({ status }).where(eq(reviewRequests.id, id));
  return { id, status };
}

export async function getImpactMetrics() {
  const db = await getDb();
  if (!db) return { plansStarted: 0, plansCompleted: 0, reviewAccessProvided: 0 };
  const [started, completed, reviewed] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(plans),
    db.select({ count: sql<number>`count(*)` }).from(plans).where(eq(plans.status, "complete")),
    db.select({ count: sql<number>`count(*)` }).from(reviewRequests).where(eq(reviewRequests.status, "completed")),
  ]);
  return { plansStarted: Number(started[0]?.count || 0), plansCompleted: Number(completed[0]?.count || 0), reviewAccessProvided: Number(reviewed[0]?.count || 0) };
}

export async function recordDonation(userId: number | null, stripePaymentIntentId: string | null) {
  const db = await getDb();
  if (!db || !stripePaymentIntentId) return;
  await db.insert(donations).values({ userId, stripePaymentIntentId }).onDuplicateKeyUpdate({ set: { userId } });
}


export async function listLegalTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legalTemplates).limit(100);
}

export async function saveLegalTemplate(input: { id?: number; title: string; kind: "will" | "prenup"; status: "draft" | "review" | "approved" | "archived"; body?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.id) {
    await db.update(legalTemplates).set({ title: input.title, kind: input.kind, status: input.status, body: input.body }).where(eq(legalTemplates.id, input.id));
    return { id: input.id };
  }
  const result = await db.insert(legalTemplates).values(input);
  return { id: Number(result[0].insertId) };
}

export async function listEducationalContent() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(educationalContent).limit(100);
}

export async function saveEducationalContent(input: { id?: number; title: string; slug: string; locale: string; status: "draft" | "published" | "archived"; body?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.id) {
    await db.update(educationalContent).set({ title: input.title, slug: input.slug, locale: input.locale, status: input.status, body: input.body }).where(eq(educationalContent.id, input.id));
    return { id: input.id };
  }
  const result = await db.insert(educationalContent).values(input);
  return { id: Number(result[0].insertId) };
}
