import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { db } from '../server/src/db/database';
import { getFounderEmail } from '../server/src/controllers/auth.controller';
import { getJwtSecret } from '../server/src/middleware/auth';

const BASE_URL = 'http://localhost:3000';

// Minimal 1x1 valid PNG binary buffer for fictional ID upload
const FICTIONAL_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

interface TestResult {
  scenario: number;
  title: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordResult(scenario: number, title: string, passed: boolean, details: string) {
  results.push({ scenario, title, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Scenario ${scenario}] ${icon}: ${title}`);
  console.log(`   Details: ${details}\n`);
}

async function runE2ETests() {
  console.log('================================================================');
  console.log('PCTE MATCH — PHASE 7: CONTROLLED E2E VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // Verify founder account exists in DB and obtain founder token
  const founderEmail = getFounderEmail();
  const founderLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: founderEmail, password: 'Password123!' }),
  });
  const founderLoginData = await founderLoginRes.json();
  const founderToken = founderLoginData.token;

  const timestamp = Date.now();
  const emailStudentA = `fictional_rohit_${timestamp}@pcte.edu.in`;
  const emailStudentB = `fictional_priya_${timestamp}@pcte.edu.in`;
  const testPassword = 'FictionalTestPass123!';

  let tokenA = '';
  let userIdA = '';
  let tokenB = '';
  let userIdB = '';
  let verificationIdA = '';
  let verificationIdB = '';

  // -------------------------------------------------------------------------
  // Scenario 1: A new student registers with a fictional PCTE account and uploads a fictional ID image
  // -------------------------------------------------------------------------
  try {
    const formDataA = new FormData();
    formDataA.append('firstName', 'Rohit');
    formDataA.append('email', emailStudentA);
    formDataA.append('password', testPassword);
    formDataA.append('confirmPassword', testPassword);
    formDataA.append('dateOfBirth', '2003-04-12'); // Age 23 (18+)
    formDataA.append('course', 'B.Tech CSE');
    formDataA.append('academicYear', '3rd Year');
    formDataA.append('termsAccepted', 'true');
    formDataA.append('idCard', new Blob([FICTIONAL_PNG_BUFFER], { type: 'image/png' }), 'fictional_rohit_id.png');

    const resA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: formDataA,
    });
    const dataA = await resA.json();

    const formDataB = new FormData();
    formDataB.append('firstName', 'Priya');
    formDataB.append('email', emailStudentB);
    formDataB.append('password', testPassword);
    formDataB.append('confirmPassword', testPassword);
    formDataB.append('dateOfBirth', '2004-08-25'); // Age 21 (18+)
    formDataB.append('course', 'BBA');
    formDataB.append('academicYear', '2nd Year');
    formDataB.append('termsAccepted', 'true');
    formDataB.append('idCard', new Blob([FICTIONAL_PNG_BUFFER], { type: 'image/png' }), 'fictional_priya_id.png');

    const resB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: formDataB,
    });
    const dataB = await resB.json();

    const s1Passed = resA.status === 201 && dataA.success && dataA.user.verificationStatus === 'PENDING_VERIFICATION' &&
                     resB.status === 201 && dataB.success && dataB.user.verificationStatus === 'PENDING_VERIFICATION';

    tokenA = dataA.token;
    userIdA = dataA.user.id;
    tokenB = dataB.token;
    userIdB = dataB.user.id;

    recordResult(
      1,
      'Student Registration with Physical ID Upload',
      s1Passed,
      `Registered Student 1 (${emailStudentA}, HTTP ${resA.status}) and Student 2 (${emailStudentB}, HTTP ${resB.status}). Both initialized to PENDING_VERIFICATION.`
    );
  } catch (err: any) {
    recordResult(1, 'Student Registration with Physical ID Upload', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 2: The accounts appear in Pending Verifications
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/admin/verifications?status=PENDING_VERIFICATION`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    const data = await res.json();

    const foundA = data.applications?.find((app: any) => app.user.email === emailStudentA);
    const foundB = data.applications?.find((app: any) => app.user.email === emailStudentB);

    if (foundA) verificationIdA = foundA.id;
    if (foundB) verificationIdB = foundB.id;

    const s2Passed = res.status === 200 && data.success && !!foundA && !!foundB &&
                     foundA.status === 'PENDING_VERIFICATION' && foundB.status === 'PENDING_VERIFICATION';

    recordResult(
      2,
      'Account Appears in Pending Verifications',
      s2Passed,
      `Founder queried /api/admin/verifications. Found applications for Rohit (vId: ${verificationIdA}) and Priya (vId: ${verificationIdB}) with status PENDING_VERIFICATION.`
    );
  } catch (err: any) {
    recordResult(2, 'Account Appears in Pending Verifications', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 3: The student cannot access Discover, Matches or Chat
  // -------------------------------------------------------------------------
  try {
    const [resDiscover, resMatches, resChat] = await Promise.all([
      fetch(`${BASE_URL}/api/discover/deck`, { headers: { Authorization: `Bearer ${tokenA}` } }),
      fetch(`${BASE_URL}/api/matches`, { headers: { Authorization: `Bearer ${tokenA}` } }),
      fetch(`${BASE_URL}/api/chat/dummy-conversation/messages`, { headers: { Authorization: `Bearer ${tokenA}` } }),
    ]);

    const s3Passed = resDiscover.status === 403 && resMatches.status === 403 && resChat.status === 403;
    recordResult(
      3,
      'Unapproved Student Blocked from Protected Features',
      s3Passed,
      `HTTP status codes -> Discover: ${resDiscover.status}, Matches: ${resMatches.status}, Chat: ${resChat.status}. All blocked with 403 Forbidden.`
    );
  } catch (err: any) {
    recordResult(3, 'Unapproved Student Blocked from Protected Features', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 4: The founder can privately view the submitted ID image
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/admin/verifications/${verificationIdA}/id-card`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type');
    const cacheControl = res.headers.get('cache-control');

    const s4Passed = res.status === 200 && Boolean(contentType?.includes('image/png')) && buffer.length === FICTIONAL_PNG_BUFFER.length &&
                     Boolean(cacheControl?.includes('no-store'));

    recordResult(
      4,
      'Founder Privately Streams Submitted ID Image',
      s4Passed,
      `HTTP ${res.status}, Content-Type: ${contentType}, Size: ${buffer.length} bytes, Cache-Control: ${cacheControl}. Image stream intact.`
    );
  } catch (err: any) {
    recordResult(4, 'Founder Privately Streams Submitted ID Image', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 5: The founder rejects a test application
  // -------------------------------------------------------------------------
  try {
    const rejectionReason = 'Fictional test rejection: physical ID card illegible or blurry.';
    const res = await fetch(`${BASE_URL}/api/admin/verifications/${verificationIdA}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${founderToken}`,
      },
      body: JSON.stringify({ action: 'REJECT', rejectionReason }),
    });
    const data = await res.json();

    const userInDb = db.prepare('SELECT verification_status FROM users WHERE id = ?').get(userIdA) as any;
    const verifInDb = db.prepare('SELECT status, rejection_reason FROM student_verifications WHERE id = ?').get(verificationIdA) as any;

    const s5Passed = res.status === 200 && data.success &&
                     userInDb?.verification_status === 'REJECTED' &&
                     verifInDb?.status === 'REJECTED' &&
                     verifInDb?.rejection_reason === rejectionReason;

    recordResult(
      5,
      'Founder Rejects Student Application',
      s5Passed,
      `HTTP ${res.status}. Application ${verificationIdA} transitioned to REJECTED with stored reason.`
    );
  } catch (err: any) {
    recordResult(5, 'Founder Rejects Student Application', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 6: The founder approves another test application
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/admin/verifications/${verificationIdB}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${founderToken}`,
      },
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    const data = await res.json();

    const userInDb = db.prepare('SELECT verification_status FROM users WHERE id = ?').get(userIdB) as any;
    const verifInDb = db.prepare('SELECT status, reviewed_at FROM student_verifications WHERE id = ?').get(verificationIdB) as any;

    const s6Passed = res.status === 200 && data.success &&
                     userInDb?.verification_status === 'APPROVED' &&
                     verifInDb?.status === 'APPROVED' &&
                     !!verifInDb?.reviewed_at;

    recordResult(
      6,
      'Founder Approves Student Application',
      s6Passed,
      `HTTP ${res.status}. Application ${verificationIdB} transitioned to APPROVED in both users and student_verifications.`
    );
  } catch (err: any) {
    recordResult(6, 'Founder Approves Student Application', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 7: The approved account can access permitted student features
  // -------------------------------------------------------------------------
  try {
    const [resDiscover, resMatches] = await Promise.all([
      fetch(`${BASE_URL}/api/discover/deck`, { headers: { Authorization: `Bearer ${tokenB}` } }),
      fetch(`${BASE_URL}/api/matches`, { headers: { Authorization: `Bearer ${tokenB}` } }),
    ]);

    const dataDiscover = await resDiscover.json();
    const dataMatches = await resMatches.json();

    const s7Passed = resDiscover.status === 200 && dataDiscover.success &&
                     resMatches.status === 200 && dataMatches.success;

    recordResult(
      7,
      'Approved Student Accesses Dating Features',
      s7Passed,
      `Discover deck HTTP ${resDiscover.status} (cards: ${dataDiscover.profiles?.length ?? 0}), Matches HTTP ${resMatches.status}. Approved student features active.`
    );
  } catch (err: any) {
    recordResult(7, 'Approved Student Accesses Dating Features', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 8: The rejected account remains blocked from those features
  // -------------------------------------------------------------------------
  try {
    const [resDiscover, resMatches, resChat] = await Promise.all([
      fetch(`${BASE_URL}/api/discover/deck`, { headers: { Authorization: `Bearer ${tokenA}` } }),
      fetch(`${BASE_URL}/api/matches`, { headers: { Authorization: `Bearer ${tokenA}` } }),
      fetch(`${BASE_URL}/api/chat/dummy-conversation/messages`, { headers: { Authorization: `Bearer ${tokenA}` } }),
    ]);

    const s8Passed = resDiscover.status === 403 && resMatches.status === 403 && resChat.status === 403;

    recordResult(
      8,
      'Rejected Student Remains Blocked from Features',
      s8Passed,
      `Discover HTTP ${resDiscover.status}, Matches HTTP ${resMatches.status}, Chat HTTP ${resChat.status}. Rejected student strictly blocked with 403 Forbidden.`
    );
  } catch (err: any) {
    recordResult(8, 'Rejected Student Remains Blocked from Features', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 9: Every approval and rejection is recorded in the audit log
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    const data = await res.json();

    const rejectLog = data.logs?.find((log: any) => log.action === 'REJECT_STUDENT' && log.target_id === userIdA);
    const approveLog = data.logs?.find((log: any) => log.action === 'APPROVE_STUDENT' && log.target_id === userIdB);

    const s9Passed = res.status === 200 && data.success && !!rejectLog && !!approveLog &&
                     rejectLog.actor_email === founderEmail &&
                     approveLog.actor_email === founderEmail;

    recordResult(
      9,
      'Audit Trail Integrity for Review Actions',
      s9Passed,
      `Found REJECT_STUDENT (target: ${userIdA}, actor: ${rejectLog?.actor_email}) and APPROVE_STUDENT (target: ${userIdB}, actor: ${approveLog?.actor_email}) in admin_audit_logs.`
    );
  } catch (err: any) {
    recordResult(9, 'Audit Trail Integrity for Review Actions', false, err.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 10: Verify student cannot approve themselves or access another student's private ID
  // -------------------------------------------------------------------------
  try {
    // 10a. Student B attempts to access Student A's private ID card
    const resAccessOtherId = await fetch(`${BASE_URL}/api/admin/verifications/${verificationIdA}/id-card`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    // 10b. Student B attempts to review Student A's verification (acting as admin)
    const resStudentReview = await fetch(`${BASE_URL}/api/admin/verifications/${verificationIdA}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ action: 'APPROVE' }),
    });

    // 10c. Self-approval defense test:
    // Student B attempts to approve their own student ID verification
    const resSelfApprove = await fetch(`${BASE_URL}/api/admin/verifications/${verificationIdB}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ action: 'APPROVE' }),
    });

    // 10d. Unauthenticated access test
    const resUnauth = await fetch(`${BASE_URL}/api/admin/verifications/${verificationIdA}/id-card`);

    const s10Passed = resAccessOtherId.status === 403 &&
                      resStudentReview.status === 403 &&
                      resSelfApprove.status === 403 &&
                      resUnauth.status === 401;

    recordResult(
      10,
      'Self-Approval and Cross-Student ID Privacy Enforcement',
      s10Passed,
      `Cross-student ID access: HTTP ${resAccessOtherId.status} (Forbidden), Unauthorized admin review: HTTP ${resStudentReview.status} (Forbidden), Self-approval attempt: HTTP ${resSelfApprove.status} (Forbidden), Unauthenticated ID stream: HTTP ${resUnauth.status} (Unauthorized).`
    );
  } catch (err: any) {
    recordResult(10, 'Self-Approval and Cross-Student ID Privacy Enforcement', false, err.message);
  }

  // Final summary
  const allPassed = results.every((r) => r.passed);
  console.log('================================================================');
  console.log(`FINAL RESULT: ${allPassed ? 'ALL 10 SCENARIOS PASSED ✅' : 'SOME SCENARIOS FAILED ❌'}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
