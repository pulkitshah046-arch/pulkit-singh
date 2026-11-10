import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const DB_PATH = path.join(STORAGE_DIR, 'pcte_match.db');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Enable Foreign Keys, WAL Mode, synchronous durability, and auto-checkpoints
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA wal_autocheckpoint = 100;');

/**
 * Flush WAL back to the primary database file so data persists reliably
 */
export function checkpointDatabase() {
  try {
    db.exec('PRAGMA wal_checkpoint(PASSIVE);');
  } catch {}
}

/**
 * Initialize all tables, constraints, indexes, and Phase 12 anonymous reveal columns
 */
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STUDENT', -- 'STUDENT' | 'FOUNDER'
      verification_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION', -- 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
      is_discovery_paused INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      anonymous_handle TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(verification_status);

    CREATE TABLE IF NOT EXISTS student_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      course TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      id_card_image_path TEXT NOT NULL,
      id_card_mime_type TEXT NOT NULL,
      id_card_file_size INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
      rejection_reason TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_verifications_status ON student_verifications(status);

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      display_nickname TEXT,
      anonymous_avatar_gradient TEXT DEFAULT 'rose',
      show_course INTEGER DEFAULT 1,
      show_academic_year INTEGER DEFAULT 1,
      bio TEXT,
      gender TEXT DEFAULT 'MAN', -- 'MAN' | 'WOMAN' | 'NON_BINARY' | 'OTHER'
      match_preference TEXT DEFAULT 'EVERYONE', -- 'MEN' | 'WOMEN' | 'EVERYONE'
      course TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      photos TEXT NOT NULL DEFAULT '[]', -- JSON array of strings (optional, up to 4)
      interests TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
      favourite_music TEXT,
      favourite_media TEXT,
      prompts TEXT NOT NULL DEFAULT '[]', -- JSON array of { prompt, answer }
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invitation_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      liker_id TEXT NOT NULL,
      liked_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(liker_id, liked_id),
      FOREIGN KEY (liker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (liked_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_likes_liked ON likes(liked_id);
    CREATE INDEX IF NOT EXISTS idx_likes_liker ON likes(liker_id);

    CREATE TABLE IF NOT EXISTS passes (
      id TEXT PRIMARY KEY,
      passer_id TEXT NOT NULL,
      passed_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(passer_id, passed_id),
      FOREIGN KEY (passer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (passed_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_passes_passer ON passes(passer_id);

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      unmatched_by TEXT,
      reveal_state TEXT NOT NULL DEFAULT 'anonymous', -- 'anonymous' | 'reveal_requested' | 'revealed' | 'reverted_to_anonymous'
      reveal_requested_by TEXT,
      user1_reveal_consent INTEGER NOT NULL DEFAULT 0,
      user2_reveal_consent INTEGER NOT NULL DEFAULT 0,
      revealed_at TEXT,
      reverted_at TEXT,
      reverted_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user1_id, user2_id),
      FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
    CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      match_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(blocker_id, blocked_id),
      FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      reported_id TEXT NOT NULL,
      category TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'
      action_taken TEXT,
      reviewed_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT,
      details TEXT, -- JSON string
      ip_address TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_audit_actor ON admin_audit_logs(actor_id);
  `);

  // Safe ALTER TABLE migrations for existing databases
  const safeAddCol = (table: string, col: string, definition: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition};`);
    } catch {}
  };

  safeAddCol('profiles', 'display_nickname', 'TEXT');
  safeAddCol('profiles', 'anonymous_avatar_gradient', "TEXT DEFAULT 'rose'");
  safeAddCol('profiles', 'show_course', 'INTEGER DEFAULT 1');
  safeAddCol('profiles', 'show_academic_year', 'INTEGER DEFAULT 1');
  safeAddCol('users', 'anonymous_handle', 'TEXT');

  safeAddCol('matches', 'reveal_state', "TEXT NOT NULL DEFAULT 'anonymous'");
  safeAddCol('matches', 'reveal_requested_by', 'TEXT');
  safeAddCol('matches', 'user1_reveal_consent', 'INTEGER NOT NULL DEFAULT 0');
  safeAddCol('matches', 'user2_reveal_consent', 'INTEGER NOT NULL DEFAULT 0');
  safeAddCol('matches', 'revealed_at', 'TEXT');
  safeAddCol('matches', 'reverted_at', 'TEXT');
  safeAddCol('matches', 'reverted_by', 'TEXT');

  // Backfill display_nickname from display_name if missing
  try {
    db.exec(`
      UPDATE profiles
      SET display_nickname = display_name
      WHERE display_nickname IS NULL OR display_nickname = '';
    `);
  } catch {}

  checkpointDatabase();
}

/**
 * Ensures the configured founder super admin account is permanently persisted.
 * Prevents account loss or accidental soft-delete lockout.
 */
export async function ensureFounderAccount(): Promise<void> {
  const founderEmail = (process.env.FOUNDER_EMAIL || 'pulkitshah046@gmail.com').trim().toLowerCase();
  if (!founderEmail) return;

  const existing = db.prepare('SELECT id, is_deleted, role FROM users WHERE email = ?').get(founderEmail) as any;

  if (existing) {
    if (existing.is_deleted === 1 || existing.role !== 'FOUNDER') {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users
        SET is_deleted = 0, is_discovery_paused = 0, verification_status = 'APPROVED', role = 'FOUNDER', updated_at = ?
        WHERE id = ?
      `).run(now, existing.id);
      checkpointDatabase();
    }
    return;
  }

  // Provision founder account if not present (fresh DB or post-reset)
  const founderId = generateId();
  const defaultPassword = process.env.FOUNDER_INITIAL_PASSWORD || 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(defaultPassword, salt);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, verification_status, is_discovery_paused, is_deleted, anonymous_handle, created_at, updated_at)
    VALUES (?, ?, ?, 'FOUNDER', 'APPROVED', 0, 0, 'founder', ?, ?)
  `).run(founderId, founderEmail, hash, now, now);

  db.prepare(`
    INSERT INTO student_verifications (
      id, user_id, first_name, date_of_birth, course, academic_year,
      id_card_image_path, id_card_mime_type, id_card_file_size, status,
      rejection_reason, reviewed_at, reviewed_by, created_at, updated_at
    ) VALUES (?, ?, 'Founder Admin', '2000-01-01', 'Founder & Management', 'Staff', 'FOUNDER_SYSTEM', 'image/jpeg', 0, 'APPROVED', NULL, ?, 'SYSTEM', ?, ?)
  `).run(generateId(), founderId, now, now, now);

  db.prepare(`
    INSERT INTO profiles (
      id, user_id, display_name, display_nickname, anonymous_avatar_gradient, show_course, show_academic_year,
      bio, gender, match_preference, course, academic_year, photos, interests, prompts, created_at, updated_at
    ) VALUES (?, ?, 'Founder Admin', 'FounderAdmin', 'amber', 1, 1, 'Founder of PCTE MATCH. Keeping campus dating safe, vetted, and respectful.', 'OTHER', 'EVERYONE', 'PCTE Administration', 'Founder', '[]', '["Startups", "Campus Tech Club"]', '[]', ?, ?)
  `).run(generateId(), founderId, now, now);

  console.log(`[PCTE MATCH] Founder account successfully initialized for ${founderEmail}`);
  checkpointDatabase();
}

export function generateId(): string {
  return crypto.randomUUID();
}
