import { getBackupFileName, shouldRotateBackups } from './backup';

describe('backup utilities', () => {
  test('generates backup filename with timestamp', () => {
    const name = getBackupFileName();
    expect(name).toMatch(/^neardrop-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/);
  });

  test('shouldRotateBackups returns files to delete when over limit', () => {
    const files = ['backup-1.db', 'backup-2.db', 'backup-3.db', 'backup-4.db'];
    const toDelete = shouldRotateBackups(files, 3);
    expect(toDelete).toEqual(['backup-1.db']);
  });

  test('shouldRotateBackups returns empty when under limit', () => {
    const files = ['backup-1.db', 'backup-2.db'];
    const toDelete = shouldRotateBackups(files, 3);
    expect(toDelete).toEqual([]);
  });

  test('shouldRotateBackups returns empty when at limit', () => {
    const files = ['a.db', 'b.db', 'c.db'];
    const toDelete = shouldRotateBackups(files, 3);
    expect(toDelete).toEqual([]);
  });
});
