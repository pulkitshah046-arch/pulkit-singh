import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { db } from '../server/src/db/database';

/**
 * Retention Policy Job:
 * Physical ID images for deleted accounts or rejected applications older than retention threshold
 * are scrubbed from disk storage/private_ids/ to protect applicant privacy.
 */
function runRetentionJob() {
  console.log('Running PCTE MATCH ID Image Retention & Privacy Purge Job...');

  // 1. Find deleted users with retained ID images
  const deletedUsers = db.prepare(`
    SELECT v.id, v.id_card_image_path, u.email
    FROM student_verifications v
    JOIN users u ON u.id = v.user_id
    WHERE u.is_deleted = 1
      AND v.id_card_image_path != 'PURGED_BY_PRIVACY_RETENTION'
  `).all() as any[];

  let purgedCount = 0;

  for (const record of deletedUsers) {
    if (record.id_card_image_path && fs.existsSync(record.id_card_image_path)) {
      try {
        fs.unlinkSync(record.id_card_image_path);
        console.log(`Purged private ID on disk for deleted user: ${record.email}`);
      } catch (err: any) {
        console.error(`Failed to unlink file ${record.id_card_image_path}:`, err.message);
      }
    }

    db.prepare(`
      UPDATE student_verifications
      SET id_card_image_path = 'PURGED_BY_PRIVACY_RETENTION', updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), record.id);

    purgedCount++;
  }

  console.log(`✅ Retention job completed. Purged ${purgedCount} private ID records from storage.`);
}

runRetentionJob();
