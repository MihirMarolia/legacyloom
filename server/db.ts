import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
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
import { InsertPlan, Plan, plans, reminderPreferences } from "../drizzle/schema";

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
