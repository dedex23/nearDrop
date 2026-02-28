import { eq, like, desc, or } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db } from './client';
import { places } from './schema';
import type { Place, PlaceInsert, Category, SourceType } from '@/types';

type PlaceRow = typeof places.$inferSelect;

function rowToPlace(row: PlaceRow): Place {
  return {
    ...row,
    tags: JSON.parse(row.tags) as string[],
    category: row.category as Category,
    sourceType: row.sourceType as SourceType,
  };
}

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
  const id = data.id || uuid();
  const row = {
    ...data,
    id,
    tags: JSON.stringify(data.tags),
    createdAt: now,
    updatedAt: now,
    notifiedAt: null,
  };
  await db.insert(places).values(row);
  return { ...data, id, createdAt: now, updatedAt: now, notifiedAt: null };
}

export async function updatePlace(id: string, data: Partial<PlaceInsert>): Promise<void> {
  const updates: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.tags) {
    updates.tags = JSON.stringify(data.tags);
  }
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
