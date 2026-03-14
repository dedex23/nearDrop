import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';

export function useDatabase() {
  const { success, error } = useMigrations(db, migrations);
  if (error) {
    console.error('[NearDrop][DB] Migration error:', error);
  }
  if (success) {
    console.log('[NearDrop][DB] Migrations OK');
  }
  return { isReady: success, error };
}
