import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'storage', 'pcte_match.db');
const BACKUP_DIR = path.resolve(process.cwd(), 'storage', 'backups');

function createBackup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database file not found at:', DB_PATH);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `pcte_match_backup_${timestamp}.db`;
  const targetPath = path.join(BACKUP_DIR, backupFilename);

  fs.copyFileSync(DB_PATH, targetPath);

  const stats = fs.statSync(targetPath);
  console.log('✅ Database backup successfully created:');
  console.log(`   Location: ${targetPath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);

  // List recent backups
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('pcte_match_backup_'));
  console.log(`\nTotal backups available in storage/backups: ${files.length}`);
}

createBackup();
