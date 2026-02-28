import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const places = sqliteTable('places', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull().default(''),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  category: text('category', {
    enum: ['restaurant', 'bar', 'cafe', 'shop', 'culture', 'sport', 'other'],
  })
    .notNull()
    .default('other'),
  tags: text('tags').notNull().default('[]'), // JSON-encoded string[]
  notes: text('notes').notNull().default(''),
  sourceType: text('source_type', {
    enum: ['manual', 'share_intent', 'instagram', 'facebook', 'google_maps', 'csv'],
  })
    .notNull()
    .default('manual'),
  sourceUrl: text('source_url'),
  imageUrl: text('image_url'),
  radius: integer('radius').notNull().default(150),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  notifiedAt: integer('notified_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
