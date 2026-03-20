import { eq, like, desc, or, asc, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { db } from './client';
import { places, categories } from './schema';
import { SOURCE_TYPES } from '@/types';
import type { Place, PlaceInsert, Category, CategoryInsert, SourceType } from '@/types';

type PlaceRow = typeof places.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;

function rowToPlace(row: PlaceRow): Place {
  return {
    ...row,
    sourceType: (SOURCE_TYPES as readonly string[]).includes(row.sourceType)
      ? (row.sourceType as SourceType)
      : 'manual',
  };
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

// ── Category queries ──────────────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  return rows.map(rowToCategory);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows.length > 0 ? rowToCategory(rows[0]) : null;
}

export async function insertCategory(data: CategoryInsert): Promise<Category> {
  const id = data.id || randomUUID();
  const createdAt = data.createdAt || new Date();
  const row = {
    id,
    name: data.name,
    color: data.color,
    icon: data.icon,
    sortOrder: data.sortOrder,
    createdAt,
  };
  await db.insert(categories).values(row);
  return { ...row };
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<CategoryInsert, 'id' | 'createdAt'>>
): Promise<void> {
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: string): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function countPlacesByCategory(categoryId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(places)
    .where(eq(places.categoryId, categoryId));
  return result[0]?.count ?? 0;
}

export async function countPlacesByAllCategories(): Promise<Record<string, number>> {
  const rows = await db
    .select({ categoryId: places.categoryId, count: sql<number>`count(*)` })
    .from(places)
    .groupBy(places.categoryId);
  return Object.fromEntries(rows.map((r) => [r.categoryId, r.count]));
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(categories)
        .set({ sortOrder: i })
        .where(eq(categories.id, orderedIds[i]));
    }
  });
}

// ── Place queries ─────────────────────────────────────────────────────

export async function getAllPlaces(): Promise<Place[]> {
  const rows = await db.select().from(places).orderBy(desc(places.createdAt));
  return rows.map(rowToPlace);
}

export async function getActivePlaces(): Promise<Place[]> {
  const rows = await db.select().from(places).where(eq(places.isActive, true));
  return rows.map(rowToPlace);
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const rows = await db.select().from(places).where(eq(places.id, id)).limit(1);
  return rows.length > 0 ? rowToPlace(rows[0]) : null;
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const pattern = `%${query}%`;
  const rows = await db
    .select()
    .from(places)
    .where(or(like(places.name, pattern), like(places.address, pattern)))
    .orderBy(desc(places.createdAt));
  return rows.map(rowToPlace);
}

export async function insertPlace(data: PlaceInsert): Promise<Place> {
  const now = new Date();
  const id = data.id || randomUUID();
  const row = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
    notifiedAt: null,
  };
  await db.insert(places).values(row);

  // Read-back verification: ensure the place was actually persisted
  const verify = await db.select().from(places).where(eq(places.id, id)).limit(1);
  if (verify.length === 0) {
    console.error('[NearDrop] INSERT succeeded but read-back failed for place:', id);
    throw new Error('Place was not persisted to database');
  }
  if (__DEV__) console.log('[NearDrop] Place saved and verified:', id, data.name);

  return { ...data, id, createdAt: now, updatedAt: now, notifiedAt: null };
}

export async function updatePlace(id: string, data: Partial<PlaceInsert>): Promise<void> {
  const updates: Record<string, unknown> = { ...data, updatedAt: new Date() };
  await db.update(places).set(updates).where(eq(places.id, id));
}

export async function deletePlace(id: string): Promise<void> {
  await db.delete(places).where(eq(places.id, id));
}

export async function markNotified(id: string): Promise<void> {
  await db
    .update(places)
    .set({ notifiedAt: new Date() })
    .where(eq(places.id, id));
}
