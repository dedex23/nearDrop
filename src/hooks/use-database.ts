import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';

export function useDatabase() {
  const { success, error } = useMigrations(db, migrations);
  return { isReady: success, error };
}
