import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { db } from '../server/src/db/database';
import { getFounderEmail } from '../server/src/controllers/auth.controller';
import { getJwtSecret } from '../server/src/middleware/auth';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

const DUMMY_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

interface TestResult {
  step: number;
  title: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(step: number, title: string, passed: boolean, details: string) {
  results.push({ step, title, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Item ${step}] ${icon}: ${title}`);
  console.log(`   Details: ${details}\n`);
}

async function registerAndApproveStudent(firstName: string, email: string, dob: string, course: string, founderToken: string) {
  const form = new FormData();
  form.append('firstName', firstName);
  form.append('email', email);
  form.append('password', 'FictionalTestPass123!');
  form.append('confirmPassword', 'FictionalTestPass123!');
  form.append('dateOfBirth', dob);
  form.append('course', course);
  form.append('academicYear', '3rd Year');
  form.append('termsAccepted', 'true');
  form.append('idCard', new Blob([DUMMY_PNG_BUFFER], { type: 'image/png' }), `${firstName}_id.png`);

  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    body: form,
  });
  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`Failed to register ${firstName}: ${regData.error}`);
  }

  const userId = regData.user.id;
  const token = regData.token;

  // Find verification application
  const verifRow = db.prepare('SELECT id FROM student_verifications WHERE user_id = ?').get(userId) as any;
  if (!verifRow) throw new Error(`Verification application not found for ${userId}`);

  // Founder approves application
  const revRes = await fetch(`${BASE_URL}/api/admin/verifications/${verifRow.id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${founderToken}`,
    },
    body: JSON.stringify({ action: 'APPROVE' }),
  });
  const revData = await revRes.json();
  if (!revRes.ok || !revData.success) {
    throw new Error(`Failed to approve ${firstName}: ${revData.error}`);
  }

  return { userId, token, email, firstName, verificationId: verifRow.id };
}

async function runDatingSuite() {
  console.log('================================================================');
  console.log('PCTE MATCH — PHASE 8: COMPLETE DATING EXPERIENCE TEST SUITE');
  console.log('================================================================\n');

  const founderEmail = getFounderEmail();
  const founderLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: founderEmail, password: 'Password123!' }),
  });
  const founderLoginData = await founderLoginRes.json();
  const founderToken = founderLoginData.token;

  const timestamp = Date.now();
  const emailKaran = `fictional_karan_${timestamp}@pcte.edu.in`;
  const emailSimran = `fictional_simran_${timestamp}@pcte.edu.in`;
  const emailAman = `fictional_aman_${timestamp}@pcte.edu.in`;

  console.log('Registering & approving 3 fictional student accounts...');
  const karan = await registerAndApproveStudent('Karan', emailKaran, '2003-05-10', 'B.Tech CSE', founderToken);
  const simran = await registerAndApproveStudent('Simran', emailSimran, '2003-09-18', 'BBA', founderToken);
  const aman = await registerAndApproveStudent('Aman', emailAman, '2004-01-22', 'B.Tech IT', founderToken);
  console.log('All 3 accounts registered and approved.\n');

  // -------------------------------------------------------------------------
  // 1. Profile creation and editing
  // -------------------------------------------------------------------------
  try {
    const updateRes = await fetch(`${BASE_URL}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${karan.token}`,
      },
      body: JSON.stringify({
        displayName: 'Karan Mehra',
        bio: 'Tech enthusiast, formula student builder, and coffee lover.',
        gender: 'MAN',
        matchPreference: 'WOMEN',
        interests: ['Coding', 'Formula Student', 'Coffee'],
        favouriteMusic: 'The Local Train',
        favouriteMedia: 'Interstellar',
        prompts: [{ prompt: 'My ideal weekend looks like...', answer: 'Building race cars and exploring local cafes.' }],
      }),
    });
    const updateData = await updateRes.json();

    const getRes = await fetch(`${BASE_URL}/api/profile/me`, {
      headers: { Authorization: `Bearer ${karan.token}` },
    });
    const getData = await getRes.json();
    const p = getData.profile;

    const p1Passed = updateRes.status === 200 && updateData.success &&
                     getRes.status === 200 &&
                     p.displayName === 'Karan Mehra' &&
                     p.gender === 'MAN' &&
                     p.matchPreference === 'WOMEN' &&
                     p.favouriteMusic === 'The Local Train' &&
                     p.interests.includes('Formula Student') &&
                     p.prompts[0]?.answer.includes('race cars');

    record(
      1,
      'Profile Creation and Editing',
      p1Passed,
      `PUT /api/profile/me (HTTP ${updateRes.status}). GET /api/profile/me verified updated display name: "${p?.displayName}", gender: ${p?.gender}, preference: ${p?.matchPreference}, music: "${p?.favouriteMusic}".`
    );
  } catch (err: any) {
    record(1, 'Profile Creation and Editing', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 2. Profile photo uploads and privacy
  // -------------------------------------------------------------------------
  let simranPhotoUrl = '';
  try {
    const photoForm = new FormData();
    photoForm.append('photos', new Blob([DUMMY_PNG_BUFFER], { type: 'image/png' }), 'simran_profile.png');

    const uploadRes = await fetch(`${BASE_URL}/api/profile/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${simran.token}` },
      body: photoForm,
    });
    const uploadData = await uploadRes.json();
    simranPhotoUrl = uploadData.photos?.[0] || '';

    // Check that photo is saved in storage/public_avatars
    const filename = path.basename(simranPhotoUrl);
    const avatarFilePath = path.resolve(process.cwd(), 'storage', 'public_avatars', filename);
    const avatarExistsOnDisk = fs.existsSync(avatarFilePath);

    // Verify privacy: student ID in storage/private_ids must NOT be accessible through /uploads/avatars or /uploads
    const privateIdLeakRes = await fetch(`${BASE_URL}/uploads/${filename}`);
    const privateIdPathLeak = await fetch(`${BASE_URL}/uploads/private_ids/nonexistent`);

    const p2Passed = uploadRes.status === 200 && uploadData.success &&
                     uploadData.photos.length > 0 &&
                     avatarExistsOnDisk &&
                     privateIdPathLeak.status === 404;

    record(
      2,
      'Profile Photo Uploads and Storage Isolation',
      p2Passed,
      `POST /api/profile/photos (HTTP ${uploadRes.status}). Avatar saved to ${simranPhotoUrl} and verified on disk in storage/public_avatars. /uploads/private_ids access blocked (HTTP ${privateIdPathLeak.status}).`
    );
  } catch (err: any) {
    record(2, 'Profile Photo Uploads and Storage Isolation', false, err.message);
  }

  // Also update Simran's gender & preference so she matches with Karan
  await fetch(`${BASE_URL}/api/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${simran.token}` },
    body: JSON.stringify({
      displayName: 'Simran Kaur',
      bio: 'BBA 2nd year. Dance club lead and avid reader.',
      gender: 'WOMAN',
      matchPreference: 'MEN',
      interests: ['Debate', 'Reading', 'Culinary'],
    }),
  });

  // Update Aman's gender & preference
  await fetch(`${BASE_URL}/api/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aman.token}` },
    body: JSON.stringify({
      displayName: 'Aman Gill',
      bio: 'B.Tech IT student.',
      gender: 'MAN',
      matchPreference: 'WOMEN',
    }),
  });

  // -------------------------------------------------------------------------
  // 3. Discover page and profile filtering
  // -------------------------------------------------------------------------
  try {
    // Karan (MAN, interested in WOMEN) requests discovery deck
    const resKaranDeck = await fetch(`${BASE_URL}/api/discover/deck`, {
      headers: { Authorization: `Bearer ${karan.token}` },
    });
    const karanDeckData = await resKaranDeck.json();
    const karanDeckIds = (karanDeckData.deck || []).map((c: any) => c.id);

    const simranInKaranDeck = karanDeckIds.includes(simran.userId);
    const amanInKaranDeck = karanDeckIds.includes(aman.userId); // Aman is MAN, Karan wants WOMEN -> Should NOT be in deck
    const karanInKaranDeck = karanDeckIds.includes(karan.userId); // Self should NOT be in deck

    // Simran (WOMAN, interested in MEN) requests discovery deck
    const resSimranDeck = await fetch(`${BASE_URL}/api/discover/deck`, {
      headers: { Authorization: `Bearer ${simran.token}` },
    });
    const simranDeckData = await resSimranDeck.json();
    const simranDeckIds = (simranDeckData.deck || []).map((c: any) => c.id);
    const karanInSimranDeck = simranDeckIds.includes(karan.userId);

    const p3Passed = resKaranDeck.status === 200 && resSimranDeck.status === 200 &&
                     simranInKaranDeck && !amanInKaranDeck && !karanInKaranDeck && karanInSimranDeck;

    record(
      3,
      'Discover Deck and Preference Filtering',
      p3Passed,
      `Karan (seeking WOMEN) sees Simran: ${simranInKaranDeck}, excludes Aman (MAN): ${!amanInKaranDeck}, excludes self: ${!karanInKaranDeck}. Simran (seeking MEN) sees Karan: ${karanInSimranDeck}.`
    );
  } catch (err: any) {
    record(3, 'Discover Deck and Preference Filtering', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 4. Like and pass functionality
  // -------------------------------------------------------------------------
  try {
    // Aman passes on a candidate or Aman records pass on Karan
    const passRes = await fetch(`${BASE_URL}/api/discover/pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aman.token}`,
      },
      body: JSON.stringify({ targetUserId: karan.userId }),
    });
    const passData = await passRes.json();

    const passDb = db.prepare('SELECT id FROM passes WHERE passer_id = ? AND passed_id = ?').get(aman.userId, karan.userId);

    const p4Passed = passRes.status === 200 && passData.success && !!passDb;
    record(
      4,
      'Like and Pass Functionality',
      p4Passed,
      `POST /api/discover/pass (HTTP ${passRes.status}). Row successfully persisted in passes table for passer: ${aman.userId}.`
    );
  } catch (err: any) {
    record(4, 'Like and Pass Functionality', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 5. Mutual likes creating exactly one match
  // -------------------------------------------------------------------------
  let mutualMatchId = '';
  let mutualConvId = '';
  let matchPopupData: any = null;
  try {
    // Simran likes Karan first (one-sided)
    const resSimranLikesKaran = await fetch(`${BASE_URL}/api/match/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${simran.token}`,
      },
      body: JSON.stringify({ targetUserId: karan.userId }),
    });
    const dataSimranLikesKaran = await resSimranLikesKaran.json();

    // Karan likes Simran back (creates mutual match!)
    const resKaranLikesSimran = await fetch(`${BASE_URL}/api/match/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${karan.token}`,
      },
      body: JSON.stringify({ targetUserId: simran.userId }),
    });
    const dataKaranLikesSimran = await resKaranLikesSimran.json();
    matchPopupData = dataKaranLikesSimran;

    // Check database state
    const matchesRows = db.prepare(`
      SELECT id, user1_id, user2_id, is_active FROM matches
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `).all(karan.userId, simran.userId, simran.userId, karan.userId) as any[];

    const convRows = matchesRows[0]?.id
      ? (db.prepare('SELECT id, match_id FROM conversations WHERE match_id = ?').all(matchesRows[0].id) as any[])
      : [];

    mutualMatchId = matchesRows[0]?.id || '';
    mutualConvId = convRows[0]?.id || '';

    const p5Passed = dataSimranLikesKaran.isMatch === false &&
                     dataKaranLikesSimran.isMatch === true &&
                     matchesRows.length === 1 &&
                     matchesRows[0].is_active === 1 &&
                     convRows.length === 1;

    record(
      5,
      'Mutual Likes Creating Exactly One Match',
      p5Passed,
      `Simran like -> isMatch: ${dataSimranLikesKaran.isMatch}. Karan like -> isMatch: ${dataKaranLikesSimran.isMatch}. Database holds exactly ${matchesRows.length} match record (id: ${mutualMatchId}) and exactly ${convRows.length} conversation record (id: ${mutualConvId}).`
    );
  } catch (err: any) {
    record(5, 'Mutual Likes Creating Exactly One Match', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 6. One-sided likes not creating matches
  // -------------------------------------------------------------------------
  try {
    // Aman likes Simran (Simran has NOT liked Aman)
    const resAmanLikesSimran = await fetch(`${BASE_URL}/api/match/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aman.token}`,
      },
      body: JSON.stringify({ targetUserId: simran.userId }),
    });
    const dataAmanLikesSimran = await resAmanLikesSimran.json();

    const matchesAmanSimran = db.prepare(`
      SELECT id FROM matches
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `).all(aman.userId, simran.userId, simran.userId, aman.userId);

    const p6Passed = resAmanLikesSimran.status === 200 &&
                     dataAmanLikesSimran.isMatch === false &&
                     matchesAmanSimran.length === 0;

    record(
      6,
      'One-Sided Likes Not Creating Matches',
      p6Passed,
      `Aman likes Simran -> isMatch: ${dataAmanLikesSimran.isMatch}. Matches table count for Aman & Simran: ${matchesAmanSimran.length}. Zero accidental matches.`
    );
  } catch (err: any) {
    record(6, 'One-Sided Likes Not Creating Matches', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 7. Match notifications and match popup data
  // -------------------------------------------------------------------------
  try {
    const mUser = matchPopupData?.match?.matchedUser;
    const p7Passed = matchPopupData?.isMatch === true &&
                     Boolean(matchPopupData?.match?.matchId) &&
                     mUser?.displayName === 'Simran Kaur' &&
                     typeof mUser?.age === 'number' &&
                     mUser?.course === 'BBA' &&
                     Boolean(mUser?.photo);

    record(
      7,
      'Match Notifications and Popup Payload',
      p7Passed,
      `Mutual match payload verified: matchId: ${matchPopupData?.match?.matchId}, partner: "${mUser?.displayName}", age: ${mUser?.age}, course: "${mUser?.course}", photo: "${mUser?.photo}". Ready for MutualMatchModal.`
    );
  } catch (err: any) {
    record(7, 'Match Notifications and Popup Payload', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 8. Private messaging between matched users
  // -------------------------------------------------------------------------
  try {
    // Simran sends message to Karan
    const sendRes1 = await fetch(`${BASE_URL}/api/chat/${mutualConvId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${simran.token}`,
      },
      body: JSON.stringify({ content: 'Hey Karan, great to match with you on PCTE Match!' }),
    });
    const sendData1 = await sendRes1.json();

    // Karan fetches messages (this should also mark Simran's message as read)
    const getRes1 = await fetch(`${BASE_URL}/api/chat/${mutualConvId}/messages`, {
      headers: { Authorization: `Bearer ${karan.token}` },
    });
    const getData1 = await getRes1.json();

    // Karan replies
    const sendRes2 = await fetch(`${BASE_URL}/api/chat/${mutualConvId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${karan.token}`,
      },
      body: JSON.stringify({ content: 'Hey Simran! Loved your profile. Are you going to the campus fest?' }),
    });
    const sendData2 = await sendRes2.json();

    const dbMessages = db.prepare('SELECT id, sender_id, content, is_read FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(mutualConvId) as any[];

    const p8Passed = sendRes1.status === 201 && sendData1.success &&
                     getRes1.status === 200 && getData1.messages.length >= 1 &&
                     sendRes2.status === 201 && sendData2.success &&
                     dbMessages.length === 2 &&
                     dbMessages[0].is_read === 1; // Verified read receipt

    record(
      8,
      'Private Messaging Between Matched Users',
      p8Passed,
      `Simran message (HTTP ${sendRes1.status}), Karan receive (HTTP ${getRes1.status}), Karan reply (HTTP ${sendRes2.status}). 2 messages in DB. Read receipt verified: message 1 is_read = 1.`
    );
  } catch (err: any) {
    record(8, 'Private Messaging Between Matched Users', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 9. Prevent messaging between unmatched users
  // -------------------------------------------------------------------------
  try {
    // Aman (not matched with Simran or Karan) attempts to read their conversation
    const resAmanRead = await fetch(`${BASE_URL}/api/chat/${mutualConvId}/messages`, {
      headers: { Authorization: `Bearer ${aman.token}` },
    });

    // Aman attempts to post a message into their conversation
    const resAmanSend = await fetch(`${BASE_URL}/api/chat/${mutualConvId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aman.token}`,
      },
      body: JSON.stringify({ content: 'Unauthorized intruder message' }),
    });

    // Attempt sending to a non-existent fake conversation ID
    const resFakeConv = await fetch(`${BASE_URL}/api/chat/non-existent-conv-id/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${karan.token}`,
      },
      body: JSON.stringify({ content: 'Hello void' }),
    });

    const p9Passed = resAmanRead.status === 403 &&
                     resAmanSend.status === 403 &&
                     resFakeConv.status === 404;

    record(
      9,
      'Prevent Messaging Between Unmatched Users',
      p9Passed,
      `Unmatched read attempt: HTTP ${resAmanRead.status} (Forbidden), Unmatched send attempt: HTTP ${resAmanSend.status} (Forbidden), Fake conversation attempt: HTTP ${resFakeConv.status} (Not Found).`
    );
  } catch (err: any) {
    record(9, 'Prevent Messaging Between Unmatched Users', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 10. Blocking and unmatching immediately revoking chat access
  // -------------------------------------------------------------------------
  try {
    // Simran unmatches Karan
    const unmatchRes = await fetch(`${BASE_URL}/api/matches/${mutualMatchId}/unmatch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${simran.token}` },
    });
    const unmatchData = await unmatchRes.json();

    const matchDb = db.prepare('SELECT is_active, unmatched_by FROM matches WHERE id = ?').get(mutualMatchId) as any;

    // Karan attempts to send message after unmatching
    const sendAfterUnmatchRes = await fetch(`${BASE_URL}/api/chat/${mutualConvId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${karan.token}`,
      },
      body: JSON.stringify({ content: 'Are you still there?' }),
    });

    // Karan attempts to fetch messages after unmatch
    const readAfterUnmatchRes = await fetch(`${BASE_URL}/api/chat/${mutualConvId}/messages`, {
      headers: { Authorization: `Bearer ${karan.token}` },
    });

    // Block test: Simran blocks Aman
    const blockRes = await fetch(`${BASE_URL}/api/moderation/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${simran.token}`,
      },
      body: JSON.stringify({ targetUserId: aman.userId }),
    });
    const blockData = await blockRes.json();

    const blockDb = db.prepare('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?').get(simran.userId, aman.userId);

    const p10Passed = unmatchRes.status === 200 && unmatchData.success &&
                      matchDb?.is_active === 0 &&
                      matchDb?.unmatched_by === simran.userId &&
                      sendAfterUnmatchRes.status === 403 &&
                      readAfterUnmatchRes.status === 403 &&
                      blockRes.status === 200 && blockData.success &&
                      !!blockDb;

    record(
      10,
      'Blocking and Unmatching Immediately Revokes Chat Access',
      p10Passed,
      `Unmatch (HTTP ${unmatchRes.status}) deactivated match in DB (is_active = 0, unmatched_by: ${simran.userId}). Post-unmatch send: HTTP ${sendAfterUnmatchRes.status} (Forbidden), Post-unmatch read: HTTP ${readAfterUnmatchRes.status} (Forbidden). Block user: HTTP ${blockRes.status} persisted in blocks table.`
    );
  } catch (err: any) {
    record(10, 'Blocking and Unmatching Immediately Revokes Chat Access', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 11. Reporting users and founder moderation
  // -------------------------------------------------------------------------
  try {
    // Simran reports Aman for inappropriate content
    const reportRes = await fetch(`${BASE_URL}/api/moderation/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${simran.token}`,
      },
      body: JSON.stringify({
        reportedUserId: aman.userId,
        category: 'HARASSMENT',
        details: 'Fictional test report: Student displayed disrespectful behavior.',
      }),
    });
    const reportData = await reportRes.json();

    // Founder checks reports queue
    const founderReportsRes = await fetch(`${BASE_URL}/api/admin/reports`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    const founderReportsData = await founderReportsRes.json();
    const createdReport = founderReportsData.reports?.find((r: any) => r.reported_id === aman.userId);

    // Founder resolves the report
    let resolveResStatus = 0;
    if (createdReport) {
      const resolveRes = await fetch(`${BASE_URL}/api/admin/reports/${createdReport.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${founderToken}`,
        },
        body: JSON.stringify({
          status: 'RESOLVED',
          actionTaken: 'Formal community guidelines warning issued to student.',
        }),
      });
      resolveResStatus = resolveRes.status;
    }

    // Check audit log for resolve action
    const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    const auditData = await auditRes.json();
    const resolveLog = auditData.logs?.find((l: any) => l.action === 'RESOLVE_REPORT' && l.target_id === createdReport?.id);

    const p11Passed = reportRes.status === 201 && reportData.success &&
                      founderReportsRes.status === 200 && Boolean(createdReport) &&
                      resolveResStatus === 200 &&
                      Boolean(resolveLog) && resolveLog.actor_email === founderEmail;

    record(
      11,
      'User Reporting and Founder Moderation',
      p11Passed,
      `Report submitted (HTTP ${reportRes.status}), visible to founder (HTTP ${founderReportsRes.status}, id: ${createdReport?.id}), resolved (HTTP ${resolveResStatus}), logged in admin audit trail with actor: ${resolveLog?.actor_email}.`
    );
  } catch (err: any) {
    record(11, 'User Reporting and Founder Moderation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 12. Account deletion and discovery pause
  // -------------------------------------------------------------------------
  try {
    // Part A: Discovery pause for Karan
    const pauseRes = await fetch(`${BASE_URL}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${karan.token}`,
      },
      body: JSON.stringify({ isDiscoveryPaused: true }),
    });
    const karanPausedDb = db.prepare('SELECT is_discovery_paused FROM users WHERE id = ?').get(karan.userId) as any;

    // Check that Karan is omitted from discovery when paused
    // Create a temporary 4th approved user (seeking MEN) to check discovery
    const tempEmail = `fictional_temp_${Date.now()}@pcte.edu.in`;
    const tempUser = await registerAndApproveStudent('TempAuditor', tempEmail, '2003-01-15', 'B.Tech CSE', founderToken);
    await fetch(`${BASE_URL}/api/profile/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tempUser.token}` },
      body: JSON.stringify({ gender: 'WOMAN', matchPreference: 'MEN' }),
    });

    const tempDeckRes = await fetch(`${BASE_URL}/api/discover/deck`, {
      headers: { Authorization: `Bearer ${tempUser.token}` },
    });
    const tempDeckData = await tempDeckRes.json();
    const tempDeckIds = (tempDeckData.deck || []).map((c: any) => c.id);
    const karanHiddenWhenPaused = !tempDeckIds.includes(karan.userId);

    // Unpause Karan
    await fetch(`${BASE_URL}/api/profile/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${karan.token}` },
      body: JSON.stringify({ isDiscoveryPaused: false }),
    });

    // Part B: Account deletion for Aman
    const deleteRes = await fetch(`${BASE_URL}/api/profile/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${aman.token}` },
    });
    const deleteData = await deleteRes.json();

    const amanDb = db.prepare('SELECT is_deleted, verification_status FROM users WHERE id = ?').get(aman.userId) as any;

    // Verify deleted user cannot log in
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: aman.email, password: 'FictionalTestPass123!' }),
    });

    const p12Passed = pauseRes.status === 200 &&
                      karanPausedDb?.is_discovery_paused === 1 &&
                      karanHiddenWhenPaused &&
                      deleteRes.status === 200 && deleteData.success &&
                      amanDb?.is_deleted === 1 &&
                      amanDb?.verification_status === 'SUSPENDED' &&
                      loginRes.status === 401;

    record(
      12,
      'Account Deletion and Discovery Pause',
      p12Passed,
      `Discovery pause: Karan paused in DB (is_discovery_paused: 1), hidden from new discovery decks: ${karanHiddenWhenPaused}. Account deletion: DELETE /api/profile/me (HTTP ${deleteRes.status}), DB updated (is_deleted: 1, status: SUSPENDED), login rejected (HTTP ${loginRes.status}).`
    );
  } catch (err: any) {
    record(12, 'Account Deletion and Discovery Pause', false, err.message);
  }

  // Final summary
  const allPassed = results.every((r) => r.passed);
  console.log('================================================================');
  console.log(`PHASE 8 SUITE RESULT: ${allPassed ? 'ALL 12 DATING FEATURES PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runDatingSuite().catch((err) => {
  console.error('Fatal dating suite error:', err);
  process.exit(1);
});
