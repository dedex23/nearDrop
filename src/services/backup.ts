import { Paths, File, Directory } from 'expo-file-system';

const BACKUP_DIR_NAME = 'backups';
const MAX_BACKUPS = 3;
const DEBOUNCE_MS = 30_000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function getBackupFileName(): string {
  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `neardrop-backup-${now}.db`;
}

export function shouldRotateBackups(files: string[], maxCount: number): string[] {
  if (files.length <= maxCount) return [];
  const sorted = [...files].sort();
  return sorted.slice(0, files.length - maxCount);
}

function getBackupDir(): Directory {
  return new Directory(Paths.document, BACKUP_DIR_NAME);
}

function ensureBackupDir(): void {
  const dir = getBackupDir();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
}

async function performBackup(): Promise<void> {
  try {
    ensureBackupDir();

    const dbFile = new File(Paths.document, 'SQLite', 'neardrop.db');

    if (!dbFile.exists) {
      if (__DEV__) console.warn('[NearDrop] Database file not found, skipping backup');
      return;
    }

    const fileName = getBackupFileName();
    const destFile = new File(getBackupDir(), fileName);

    dbFile.copy(destFile);

    // Rotate old backups
    const backupDir = getBackupDir();
    const entries = backupDir.list();
    const backupFiles = entries
      .filter((e): e is File => e instanceof File)
      .map((f) => f.name)
      .filter((name) => name.startsWith('neardrop-backup-') && name.endsWith('.db'));

    const toDelete = shouldRotateBackups(backupFiles, MAX_BACKUPS);

    for (const name of toDelete) {
      const file = new File(backupDir, name);
      if (file.exists) {
        file.delete();
      }
    }

    if (__DEV__) console.log(`[NearDrop] Backup created: ${fileName}`);
  } catch (error) {
    console.error('[NearDrop] Backup failed:', error);
  }
}

export function scheduleBackup(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(performBackup, DEBOUNCE_MS);
}

export function getBackupList(): { name: string; date: Date; size: number }[] {
  try {
    ensureBackupDir();
    const backupDir = getBackupDir();
    const entries = backupDir.list();

    const backups = entries
      .filter((e): e is File => e instanceof File)
      .map((f) => f.name)
      .filter((name) => name.startsWith('neardrop-backup-') && name.endsWith('.db'))
      .sort()
      .reverse();

    const result = [];
    for (const name of backups) {
      const file = new File(backupDir, name);
      if (file.exists) {
        // Filename: neardrop-backup-YYYY-MM-DDTHH-MM-SS.db
        // toISOString() returns UTC, so the filename is in UTC.
        // Parse: replace last two dash-pairs with colons to reconstruct ISO string
        const dateStr = name
          .replace('neardrop-backup-', '')
          .replace('.db', '')
          .replace(/-(\d{2})-(\d{2})$/, ':$1:$2');
        // Append Z to indicate UTC (toISOString produces UTC timestamps)
        result.push({ name, date: new Date(dateStr + 'Z'), size: file.size });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function restoreBackup(backupName: string): boolean {
  try {
    const backupDir = getBackupDir();
    const srcFile = new File(backupDir, backupName);
    const destFile = new File(Paths.document, 'SQLite', 'neardrop.db');

    if (!srcFile.exists) return false;

    // expo-file-system copy() throws if destination exists — delete first
    if (destFile.exists) {
      destFile.delete();
    }
    srcFile.copy(destFile);
    return true;
  } catch (error) {
    console.error('[NearDrop] Restore failed:', error);
    return false;
  }
}

export function getLastBackupDate(): Date | null {
  const backups = getBackupList();
  return backups.length > 0 ? backups[0].date : null;
}
