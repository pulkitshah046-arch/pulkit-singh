import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { db, checkpointDatabase } from '../server/src/db/database';
import { getFounderEmail } from '../server/src/controllers/auth.controller';
import { getJwtSecret } from '../server/src/middleware/auth';

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

async function registerStudent(firstName: string, nickname: string, email: string, dob: string, course: string) {
  const form = new FormData();
  form.append('firstName', firstName);
  form.append('displayNickname', nickname);
  form.append('email', email);
  form.append('password', 'FictionalTestPass123!');
  form.append('confirmPassword', 'FictionalTestPass123!');
  form.append('dateOfBirth', dob);
  form.append('course', course);
  form.append('academicYear', '3rd Year');
  form.append('termsAccepted', 'true');
  const blob = new Blob([DUMMY_PNG_BUFFER], { type: 'image/png' });
  form.append('idCard', blob, 'pcte_id.png');

  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log('================================================================');
  console.log('PCTE MATCH — PHASE 12: SEMI-ANONYMOUS & REVERSIBLE REVEAL TEST');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const testStudentAEmail = `fictional.anon.alex.${timestamp}@pcte.test`;
  const testStudentBEmail = `fictional.anon.bella.${timestamp}@pcte.test`;
  const testStudentCEmail = `fictional.anon.chris.${timestamp}@pcte.test`;

  // 1. Founder Login
  const founderEmail = getFounderEmail();
  const founderLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: founderEmail, password: 'Password123!' }),
  });
  const founderLoginData = await founderLoginRes.json();
  const founderToken = founderLoginData.token;

  record(
    1,
    'Founder Authentication & Role Verification',
    founderLoginRes.status === 200 && founderLoginData.user?.role === 'FOUNDER',
    `Status ${founderLoginRes.status}. Role: ${founderLoginData.user?.role}. User ID: ${founderLoginData.user?.id}`
  );

  // 2. Register Student A with custom anonymous nickname
  const regARes = await registerStudent('Alexandros', 'CampusNinja', testStudentAEmail, '2003-04-12', 'B.Tech CSE');
  if (regARes.status !== 201) {
    console.error('Registration A failed:', regARes.status, regARes.data);
  }
  const tokenA = regARes.data?.token;
  const userAId = regARes.data?.user?.id;

  record(
    2,
    'Student Registration with Anonymous Nickname & Physical ID',
    regARes.status === 201 && regARes.data.user?.displayNickname === 'CampusNinja',
    `Student A registered with nickname: ${regARes.data.user?.displayNickname}. Status: ${regARes.status}`
  );

  // 3. Pending Verification Gatekeeper: Student A cannot access Discover/Chat/Matches
  const pendingDiscoverRes = await fetch(`${BASE_URL}/api/discover`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const pendingMatchesRes = await fetch(`${BASE_URL}/api/matches`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  record(
    3,
    'Pending Account Access Control (Gated before Founder Verification)',
    pendingDiscoverRes.status === 403 && pendingMatchesRes.status === 403,
    `Discover returned HTTP ${pendingDiscoverRes.status}. Matches returned HTTP ${pendingMatchesRes.status}.`
  );

  // 4. Register Student B & Student C
  const regBRes = await registerStudent('BellaMarie', 'StarlightVibes', testStudentBEmail, '2004-02-18', 'BBA');
  const tokenB = regBRes.data.token;
  const userBId = regBRes.data.user.id;

  const regCRes = await registerStudent('Christopher', 'QuietCoder', testStudentCEmail, '2002-11-05', 'BCA');
  const tokenC = regCRes.data.token;
  const userCId = regCRes.data.user.id;

  // 5. Founder reviews and approves Student A, B, and C
  const approveA = await fetch(`${BASE_URL}/api/admin/verifications/${userAId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${founderToken}` },
    body: JSON.stringify({ action: 'APPROVE', rejectionReason: null }),
  });
  const approveB = await fetch(`${BASE_URL}/api/admin/verifications/${userBId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${founderToken}` },
    body: JSON.stringify({ action: 'APPROVE', rejectionReason: null }),
  });
  const approveC = await fetch(`${BASE_URL}/api/admin/verifications/${userCId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${founderToken}` },
    body: JSON.stringify({ action: 'APPROVE', rejectionReason: null }),
  });

  record(
    4,
    'Founder Verification Approval',
    approveA.status === 200 && approveB.status === 200 && approveC.status === 200,
    `Approvals: A(${approveA.status}), B(${approveB.status}), C(${approveC.status}).`
  );

  // 6. Optional Photos & Aesthetic Gradient Avatar Verification
  // Student A sets gender and preferences without uploading any photos
  const updateProfileA = await fetch(`${BASE_URL}/api/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      displayName: 'CampusNinja',
      displayNickname: 'CampusNinja',
      anonymousAvatarGradient: 'emerald',
      showCourse: true,
      showAcademicYear: false,
      gender: 'MAN',
      matchPreference: 'WOMEN',
      interests: ['Coding', 'Gaming'],
    }),
  });
  const profileAData = await updateProfileA.json();

  record(
    5,
    'Optional Photos Model & Anonymous Avatar Customization',
    updateProfileA.status === 200 && profileAData.profile?.photos?.length === 0 && profileAData.profile?.anonymousAvatarGradient === 'emerald',
    `Photos length: ${profileAData.profile?.photos?.length}. Gradient: ${profileAData.profile?.anonymousAvatarGradient}. Show Year: ${profileAData.profile?.showAcademicYear}`
  );

  // Set Student B preferences
  const updateBRes = await fetch(`${BASE_URL}/api/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      displayName: 'StarlightVibes',
      displayNickname: 'StarlightVibes',
      anonymousAvatarGradient: 'rose',
      showCourse: true,
      showAcademicYear: true,
      gender: 'WOMAN',
      matchPreference: 'MEN',
      interests: ['Coffee', 'Photography'],
    }),
  });
  const updateBData = await updateBRes.json();
  console.log('Student B Profile Update Result:', updateBRes.status, updateBData);

  // 7. Discover Feed Leakage Test: Zero Real Names, Zero Personal PII
  const discoverRes = await fetch(`${BASE_URL}/api/discover`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const discoverData = await discoverRes.json();
  const allCards = discoverData.cards || discoverData.deck || [];
  console.log(`Debug Discover candidates count: ${allCards.length}, IDs:`, allCards.map((c: any) => ({ id: c.id, name: c.displayName, gender: c.gender })));
  const cardForB = allCards.find((c: any) => c.id === userBId || c.userId === userBId);

  const containsRealFirstName = JSON.stringify(discoverData).includes('BellaMarie');
  const containsEmail = JSON.stringify(discoverData).includes(testStudentBEmail);
  const containsDob = JSON.stringify(discoverData).includes('2004-02-18');

  record(
    6,
    'Discover API Zero-Leakage Privacy Audit',
    cardForB && !containsRealFirstName && !containsEmail && !containsDob && cardForB.displayName === 'StarlightVibes',
    `Public display name: "${cardForB?.displayName}". Real Name leaked: ${containsRealFirstName}. Email leaked: ${containsEmail}. DOB leaked: ${containsDob}.`
  );

  // 8. One-Sided Like does not create match
  const likeARes = await fetch(`${BASE_URL}/api/matches/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ targetUserId: userBId, action: 'LIKE' }),
  });
  const likeAData = await likeARes.json();

  record(
    7,
    'One-Sided Like: No Premature Match Creation',
    likeARes.status === 200 && likeAData.isMatch === false,
    `User A liked User B -> isMatch: ${likeAData.isMatch}`
  );

  // 9. Mutual Like creates match with default 'anonymous' reveal_state
  const likeBRes = await fetch(`${BASE_URL}/api/matches/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ targetUserId: userAId, action: 'LIKE' }),
  });
  const likeBData = await likeBRes.json();
  const matchId = likeBData.match?.id;
  const conversationId = likeBData.match?.conversationId;

  record(
    8,
    'Mutual Match Creation in Anonymous Mode',
    likeBRes.status === 200 && likeBData.isMatch === true && likeBData.match?.revealState === 'anonymous',
    `Match ID: ${matchId}. Conversation: ${conversationId}. Initial reveal state: ${likeBData.match?.revealState}`
  );

  // 10. Chat Messages Endpoint in Anonymous Mode: Zero Real Name Disclosed
  const chatMessagesRes = await fetch(`${BASE_URL}/api/chat/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const chatData = await chatMessagesRes.json();

  const chatLeakedName = JSON.stringify(chatData).includes('BellaMarie');

  record(
    9,
    'Pre-Reveal Chat Privacy: Real Name Gated',
    chatData.revealState === 'anonymous' && chatData.revealedIdentity === null && !chatLeakedName,
    `revealState: ${chatData.revealState}. revealedIdentity: ${JSON.stringify(chatData.revealedIdentity)}. Name leaked: ${chatLeakedName}`
  );

  // 11. One-Sided Identity Reveal Request: User A requests reveal
  const reqRevealRes = await fetch(`${BASE_URL}/api/matches/${matchId}/reveal/request`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const reqRevealData = await reqRevealRes.json();

  // Check state from both User A and User B
  const chatStateA = await (await fetch(`${BASE_URL}/api/chat/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })).json();
  const chatStateB = await (await fetch(`${BASE_URL}/api/chat/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })).json();

  const revealOneSidedLeaked = JSON.stringify(chatStateA).includes('BellaMarie') || JSON.stringify(chatStateB).includes('Alexandros');

  record(
    10,
    'One-Sided Reveal Request: Zero Premature Leakage',
    reqRevealRes.status === 200 &&
    chatStateA.revealState === 'reveal_requested' &&
    chatStateB.revealState === 'reveal_pending' &&
    !revealOneSidedLeaked,
    `Requester State: ${chatStateA.revealState}. Target State: ${chatStateB.revealState}. Identities leaked: ${revealOneSidedLeaked}`
  );

  // 12. Mutual Consent: User B accepts identity reveal
  const acceptRevealRes = await fetch(`${BASE_URL}/api/matches/${matchId}/reveal/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const acceptRevealData = await acceptRevealRes.json();

  const chatRevealedA = await (await fetch(`${BASE_URL}/api/chat/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })).json();
  const chatRevealedB = await (await fetch(`${BASE_URL}/api/chat/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })).json();

  record(
    11,
    'Mutual Identity Reveal (Explicit Two-Sided Consent)',
    acceptRevealRes.status === 200 &&
    chatRevealedA.revealState === 'revealed' &&
    chatRevealedA.revealedIdentity?.realFirstName === 'BellaMarie' &&
    chatRevealedB.revealedIdentity?.realFirstName === 'Alexandros',
    `User A sees real name: "${chatRevealedA.revealedIdentity?.realFirstName}". User B sees real name: "${chatRevealedB.revealedIdentity?.realFirstName}".`
  );

  // 13. Reversible Identity Reveal: User A unilaterally reverts to Anonymous Mode
  const revertRes = await fetch(`${BASE_URL}/api/matches/${matchId}/reveal/revert`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const revertData = await revertRes.json();

  const chatAfterRevertA = await (await fetch(`${BASE_URL}/api/chat/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })).json();
  const chatAfterRevertB = await (await fetch(`${BASE_URL}/api/chat/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })).json();

  const matchAfterRevert = await (await fetch(`${BASE_URL}/api/matches`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })).json();

  const nameFoundAfterRevertA = JSON.stringify(chatAfterRevertA).includes('BellaMarie');
  const nameFoundAfterRevertB = JSON.stringify(chatAfterRevertB).includes('Alexandros');

  record(
    12,
    'Reversible Identity Reveal (Unilateral Return to Anonymous Mode)',
    revertRes.status === 200 &&
    chatAfterRevertA.revealState === 'reverted_to_anonymous' &&
    chatAfterRevertA.revealedIdentity === null &&
    chatAfterRevertB.revealedIdentity === null &&
    !nameFoundAfterRevertA &&
    !nameFoundAfterRevertB,
    `Revert status: ${revertRes.status}. State: ${chatAfterRevertA.revealState}. API hides names: ${!nameFoundAfterRevertA && !nameFoundAfterRevertB}`
  );

  // 14. Decline Flow Verification with Student C
  // Pair Student B & Student C
  await fetch(`${BASE_URL}/api/matches/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ targetUserId: userCId, action: 'LIKE' }),
  });
  const matchBCRes = await fetch(`${BASE_URL}/api/matches/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
    body: JSON.stringify({ targetUserId: userBId, action: 'LIKE' }),
  });
  const matchBCData = await matchBCRes.json();
  const matchBCId = matchBCData.match?.id;

  // Student B requests reveal
  await fetch(`${BASE_URL}/api/matches/${matchBCId}/reveal/request`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  // Student C declines
  const declineRes = await fetch(`${BASE_URL}/api/matches/${matchBCId}/reveal/decline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenC}` },
  });
  const declineData = await declineRes.json();

  record(
    13,
    'Decline Reveal Flow: Safely Preserves Anonymous State',
    declineRes.status === 200 && declineData.revealState === 'anonymous',
    `Decline status: ${declineRes.status}. Reveal state returned to: ${declineData.revealState}`
  );

  // 15. Student Role Isolation: Student cannot access Founder Endpoints (403)
  const studentAccessFounder = await fetch(`${BASE_URL}/api/admin/verifications`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  record(
    14,
    'RBAC Security: Student Access to Admin Endpoints Strictly Denied',
    studentAccessFounder.status === 403,
    `Ordinary student calling /api/admin/verifications returned HTTP ${studentAccessFounder.status} Forbidden.`
  );

  // Summary
  console.log('================================================================');
  console.log('TEST SUMMARY');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Scenarios Tested : ${total}`);
  console.log(`Passed                 : ${passed}`);
  console.log(`Failed                 : ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
