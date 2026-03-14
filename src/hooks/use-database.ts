import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';

export function useDatabase() {
  console.log('[NearDrop][DB] Starting migrations..., entries:', migrations.journal.entries.length);
  const { success, error } = useMigrations(db, migrations);
  console.log('[NearDrop][DB] Migration state: success=', success, 'error=', error ? String(error) : 'none');
  return { isReady: success, error };
}
