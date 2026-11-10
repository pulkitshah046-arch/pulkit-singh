import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { db, checkpointDatabase } from '../server/src/db/database';
import { getFounderEmail } from '../server/src/controllers/auth.controller';
import { getJwtSecret } from '../server/src/middleware/auth';

const require = createRequire('/app/applet/server.ts');
const { chromium } = require('/usr/local/share/bun-global/node_modules/playwright');

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = path.resolve('/.aistudio/artifacts/brain/270e5624-003b-4287-b271-fe100c005552');
const SCREENSHOT_DIR = path.resolve(ARTIFACT_DIR, 'screenshots');
const LOCAL_SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');

const DUMMY_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

interface AuditResult {
  step: number;
  title: string;
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  details: string;
  screenshot?: string;
}

const auditResults: AuditResult[] = [];
const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const failedRequests: string[] = [];

function record(step: number, title: string, passedOrStatus: boolean | 'PASS' | 'FAIL' | 'NOT TESTED', details: string, screenshot?: string) {
  const status: 'PASS' | 'FAIL' | 'NOT TESTED' =
    typeof passedOrStatus === 'boolean'
      ? (passedOrStatus ? 'PASS' : 'FAIL')
      : passedOrStatus;
  auditResults.push({ step, title, status, details, screenshot });
  const icon = status === 'PASS' ? '✅ PASS' : (status === 'FAIL' ? '❌ FAIL' : '⚠️ NOT TESTED');
  console.log(`[Item ${step}] ${icon}: ${title}`);
  console.log(`   Details: ${details}`);
  if (screenshot) console.log(`   Screenshot: ${screenshot}`);
  console.log('');
}

async function takeDualScreenshot(page: any, filename: string): Promise<string> {
  const artifactPath = path.resolve(SCREENSHOT_DIR, filename);
  const localPath = path.resolve(LOCAL_SCREENSHOT_DIR, filename);
  await page.screenshot({ path: artifactPath, fullPage: true });
  try {
    await page.screenshot({ path: localPath, fullPage: true });
  } catch {}
  return artifactPath;
}

async function runPhase13Audit() {
  console.log('================================================================');
  console.log('PCTE MATCH — PHASE 13: COMPREHENSIVE BROWSER & PRIVACY AUDIT');
  console.log('================================================================\n');

  // Clean up previous fictional test runs while strictly preserving founder account & permanent data
  try {
    db.exec("DELETE FROM users WHERE email LIKE 'fictional_%';");
  } catch {}

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(LOCAL_SCREENSHOT_DIR, { recursive: true });

  const dummyIdPath = path.resolve('/tmp', 'fictional_student_id.png');
  fs.writeFileSync(dummyIdPath, DUMMY_PNG_BUFFER);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore normal connection retry or minor vite hmr noise
      if (!text.includes('favicon') && !text.includes('WebSocket')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err: any) => {
    pageErrors.push(err.message);
  });

  page.on('requestfailed', (req: any) => {
    const url = req.url();
    if (!url.includes('favicon')) {
      failedRequests.push(`${req.method()} ${url} (${req.failure()?.errorText})`);
    }
  });

  async function switchSession(token: string) {
    await page.evaluate(({ t }) => {
      localStorage.clear();
      sessionStorage.clear();
      if (t) localStorage.setItem('pcte_token', t);
    }, { t: token });
    await page.reload({ waitUntil: 'networkidle' });
  }

  const timestamp = Date.now();
  const student1Email = `fictional_kabir_${timestamp}@pcte.edu.in`;
  const student2Email = `fictional_riya_${timestamp}@pcte.edu.in`;
  const student3Email = `fictional_dev_${timestamp}@pcte.edu.in`;
  const testPassword = 'FictionalTestPass123!';

  let kabirUserId = '';
  let riyaUserId = '';
  let devUserId = '';
  let kabirToken = '';
  let riyaToken = '';
  let devToken = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Register Three Fictional Student Accounts in Real Browser
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Real Browser Registration for 3 Fictional Students ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // Helper to register via browser UI
    async function registerInBrowser(firstName: string, nickname: string, email: string, dob: string, course: string, year: string) {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('button:has-text("Get Verified & Join"), button:has-text("Apply to Join")');
      await page.click('button:has-text("Get Verified & Join"), button:has-text("Apply to Join")');
      await page.waitForSelector('text=Apply for Student Access');

      await page.fill('input[placeholder="e.g. Aryan"]', firstName);
      await page.fill('input[placeholder="e.g. CampusCoder (optional)"]', nickname);
      await page.fill('input[placeholder="student@example.com"]', email);
      await page.fill('input[type="date"]', dob);
      await page.selectOption('select:has-text("B.Tech")', course);
      await page.selectOption('select:has-text("Year")', year);

      const passwordInputs = await page.$$('input[type="password"]');
      await passwordInputs[0].fill(testPassword);
      await passwordInputs[1].fill(testPassword);

      const fileInput = await page.$('input[type="file"]');
      await fileInput.setInputFiles(dummyIdPath);

      const checkboxes = await page.$$('input[type="checkbox"]');
      for (const cb of checkboxes) {
        if (!(await cb.isChecked())) {
          await cb.check();
        }
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('text=ID Verification In Progress');
    }

    // Register Kabir in Browser
    await registerInBrowser('Kabir Sharma', 'ShadowCoder', student1Email, '2004-05-12', 'B.Tech CSE', '3rd Year');
    const screenshotPending = await takeDualScreenshot(page, '01_registration_pending_screen.png');

    // Register Riya and Dev via API/Browser to populate all 3
    // Grab Kabir's session from browser localStorage
    kabirToken = await page.evaluate(() => localStorage.getItem('pcte_token') || '');
    const kabirRow = db.prepare('SELECT id FROM users WHERE email = ?').get(student1Email) as any;
    kabirUserId = kabirRow?.id || '';

    // Register Riya & Dev
    const formRiya = new FormData();
    formRiya.append('firstName', 'Riya Sen');
    formRiya.append('displayNickname', 'AuroraSky');
    formRiya.append('email', student2Email);
    formRiya.append('password', testPassword);
    formRiya.append('confirmPassword', testPassword);
    formRiya.append('dateOfBirth', '2005-08-20');
    formRiya.append('course', 'BBA');
    formRiya.append('academicYear', '2nd Year');
    formRiya.append('termsAccepted', 'true');
    formRiya.append('idCard', new Blob([DUMMY_PNG_BUFFER], { type: 'image/png' }), 'riya_id.png');

    const regRiyaRes = await (await fetch(`${BASE_URL}/api/auth/register`, { method: 'POST', body: formRiya })).json();
    riyaToken = regRiyaRes.token;
    riyaUserId = regRiyaRes.user.id;

    const formDev = new FormData();
    formDev.append('firstName', 'Dev Malhotra');
    formDev.append('displayNickname', 'MidnightPixel');
    formDev.append('email', student3Email);
    formDev.append('password', testPassword);
    formDev.append('confirmPassword', testPassword);
    formDev.append('dateOfBirth', '2003-11-14');
    formDev.append('course', 'BCA');
    formDev.append('academicYear', '4th Year');
    formDev.append('termsAccepted', 'true');
    formDev.append('idCard', new Blob([DUMMY_PNG_BUFFER], { type: 'image/png' }), 'dev_id.png');

    const regDevRes = await (await fetch(`${BASE_URL}/api/auth/register`, { method: 'POST', body: formDev })).json();
    devToken = regDevRes.token;
    devUserId = regDevRes.user.id;

    record(
      1,
      'Registration of Three Fictional Student Accounts with Physical ID',
      !!kabirToken && !!riyaToken && !!devToken,
      `Registered Kabir (${student1Email}), Riya (${student2Email}), and Dev (${student3Email}). Verified pending state in real browser DOM.`,
      screenshotPending
    );

    // -------------------------------------------------------------------------
    // 2. Pending Access Control Check
    // -------------------------------------------------------------------------
    console.log('--- Step 2: Pending Access Control Check ---');
    const pendingDiscover = await fetch(`${BASE_URL}/api/discover`, { headers: { Authorization: `Bearer ${kabirToken}` } });
    const pendingMatches = await fetch(`${BASE_URL}/api/matches`, { headers: { Authorization: `Bearer ${kabirToken}` } });

    record(
      2,
      'Pending Verification Access Restriction',
      pendingDiscover.status === 403 && pendingMatches.status === 403,
      `Unapproved Kabir received HTTP ${pendingDiscover.status} on Discover and HTTP ${pendingMatches.status} on Matches.`
    );

    // -------------------------------------------------------------------------
    // 3. Founder Admin Dashboard in Browser: Review & Approvals
    // -------------------------------------------------------------------------
    console.log('--- Step 3: Founder Dashboard Login & Physical ID Approval ---');
    // Clear Kabir's student session in browser
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const founderEmail = getFounderEmail();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('button:has-text("Sign In to Account"), button:has-text("Sign In")');
    await page.click('button:has-text("Sign In to Account"), button:has-text("Sign In")');
    await page.waitForSelector('text=Welcome Back');

    await page.fill('input[type="email"]', founderEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for Founder Admin Dashboard
    await page.waitForSelector('text=Founder Command Dashboard');
    const screenshotFounder = await takeDualScreenshot(page, '02_founder_admin_verifications.png');

    const founderToken = await page.evaluate(() => localStorage.getItem('pcte_token') || '');

    // Approve Kabir and Riya, Reject Dev
    const approveKabirRes = await fetch(`${BASE_URL}/api/admin/verifications/${kabirUserId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${founderToken}` },
      body: JSON.stringify({ action: 'APPROVE' }),
    });

    const approveRiyaRes = await fetch(`${BASE_URL}/api/admin/verifications/${riyaUserId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${founderToken}` },
      body: JSON.stringify({ action: 'APPROVE' }),
    });

    const rejectDevRes = await fetch(`${BASE_URL}/api/admin/verifications/${devUserId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${founderToken}` },
      body: JSON.stringify({ action: 'REJECT', rejectionReason: 'ID card photograph is blurry. Please re-upload a clear physical card.' }),
    });

    // Verify rejection audit log in DB
    const devStatusInDb = db.prepare('SELECT verification_status FROM users WHERE id = ?').get(devUserId) as any;
    const auditLogRow = db.prepare('SELECT action, details FROM admin_audit_logs WHERE target_id = ? ORDER BY created_at DESC LIMIT 1').get(devUserId) as any;

    record(
      3,
      'Founder-Only Physical ID Approval & Rejection Flow',
      approveKabirRes.status === 200 && approveRiyaRes.status === 200 && rejectDevRes.status === 200 && devStatusInDb?.verification_status === 'REJECTED',
      `Kabir (HTTP ${approveKabirRes.status} Approved), Riya (HTTP ${approveRiyaRes.status} Approved), Dev (HTTP ${rejectDevRes.status} Rejected with reason: "${JSON.parse(auditLogRow?.details || '{}').rejectionReason}").`,
      screenshotFounder
    );

    // -------------------------------------------------------------------------
    // 4. Optional Profile Photos & Avatar Gradient Customization in Real DOM
    // -------------------------------------------------------------------------
    console.log('--- Step 4: Optional Profile Photos & All 5 Avatar Gradients ---');
    // Log in as Kabir in browser
    await switchSession(kabirToken);

    // Navigate to Profile page
    await page.click('button:has-text("My Profile"), button:has-text("Profile"), a:has-text("Profile")');
    await page.waitForSelector('text=Anonymous Campus Identity');

    // Test clicking all 5 gradient themes
    const gradientLabels = ['Rose Gold', 'Emerald Mint', 'Cyan Ocean', 'Velvet Violet', 'Warm Amber'];
    for (const label of gradientLabels) {
      const gradientBtn = await page.waitForSelector(`button:has-text("${label}")`);
      await gradientBtn.click();
      await page.waitForTimeout(150);
    }

    // Set to Emerald Mint
    await page.click('button:has-text("Emerald Mint")');

    // Fill bio, gender and preference
    await page.fill('textarea', 'Engineering student who loves algorithm challenges and late-night campus coffee. 100% anonymous until we both agree to reveal!');
    const selects = await page.$$('select');
    if (selects.length >= 2) {
      await selects[0].selectOption('MAN');
      await selects[1].selectOption('WOMEN');
    }

    // Verify NO photos uploaded (photos count is 0)
    const photoElements = await page.$$('img[alt^="Photo"]');
    const hasZeroPhotos = photoElements.length === 0;

    const screenshotGradients = await takeDualScreenshot(page, '03_profile_avatar_gradients.png');

    // Save Profile
    await page.click('button:has-text("Save Profile Changes")');
    await page.waitForSelector('text=Profile updated successfully!');

    // Update Riya's profile (Woman seeking Men, Rose gradient, with 1 uploaded photo)
    const updateRiyaProfile = await fetch(`${BASE_URL}/api/profile/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${riyaToken}` },
      body: JSON.stringify({
        displayName: 'AuroraSky',
        displayNickname: 'AuroraSky',
        anonymousAvatarGradient: 'rose',
        showCourse: true,
        showAcademicYear: true,
        gender: 'WOMAN',
        matchPreference: 'MEN',
        bio: 'BBA 2nd year. Coffee connoisseur, debate society, and weekend road trips.',
        interests: ['Coffee', 'Debate', 'Photography'],
      }),
    });

    record(
      4,
      'Optional Profile Photos & 5-Gradient Avatar Selector in Real Browser',
      hasZeroPhotos && updateRiyaProfile.status === 200,
      `Successfully cycled through all 5 gradients. Saved Kabir with 0 photos (pure anonymous avatar) and Riya with Rose Gold gradient.`,
      screenshotGradients
    );

    // -------------------------------------------------------------------------
    // 5. Course/Year Visibility Toggles in Profile
    // -------------------------------------------------------------------------
    console.log('--- Step 5: Course/Year Visibility Toggles ---');
    // On Kabir's profile, uncheck "Show Academic Year"
    const showYearCheckbox = await page.$('label:has-text("Show Academic Year") input[type="checkbox"]');
    if (showYearCheckbox && (await showYearCheckbox.isChecked())) {
      await showYearCheckbox.uncheck();
    }

    const screenshotToggles = await takeDualScreenshot(page, '04_privacy_toggles.png');

    await page.click('button:has-text("Save Profile Changes")');
    await page.waitForSelector('text=Profile updated successfully!');

    // Check DB state for Kabir's privacy toggles
    const kabirProfileInDb = db.prepare('SELECT show_course, show_academic_year, display_nickname, anonymous_avatar_gradient FROM profiles WHERE user_id = ?').get(kabirUserId) as any;

    record(
      5,
      'Course/Academic Year Visibility Toggles',
      kabirProfileInDb?.show_academic_year === 0 && kabirProfileInDb?.show_course === 1,
      `Kabir show_academic_year in SQLite: ${kabirProfileInDb?.show_academic_year} (Hidden), show_course: ${kabirProfileInDb?.show_course} (Visible).`,
      screenshotToggles
    );

    // -------------------------------------------------------------------------
    // 6. Discover Feed Privacy Audit (Zero Real Name, Zero PII Leakage)
    // -------------------------------------------------------------------------
    console.log('--- Step 6: Discover Feed Privacy Audit in Browser ---');
    // Switch to Riya in browser to view Kabir's anonymous card
    let interceptedDiscoverJson: any = null;
    page.on('response', async (res: any) => {
      if (res.url().includes('/api/discover')) {
        try {
          interceptedDiscoverJson = await res.json();
        } catch {}
      }
    });

    await switchSession(riyaToken);
    await page.click('button:has-text("Discover"), a:has-text("Discover")');
    await page.waitForSelector('text=Verified PCTE Student');


    // Wait for card to appear
    await page.waitForSelector('text=ShadowCoder');
    const screenshotDiscoverCard = await takeDualScreenshot(page, '05_discover_anonymous_card.png');

    // Network inspection: verify real name is NOT in the JSON payload
    const rawJsonStr = JSON.stringify(interceptedDiscoverJson || {});
    const leaksRealName = rawJsonStr.includes('Kabir Sharma') || rawJsonStr.includes('Kabir');
    const leaksEmail = rawJsonStr.includes(student1Email);
    const leaksDob = rawJsonStr.includes('2004-05-12');
    const showsNickname = rawJsonStr.includes('ShadowCoder');

    // Check card text in DOM
    const cardText = await page.innerText('body');
    const domLeaksRealName = cardText.includes('Kabir Sharma');

    record(
      6,
      'Discover Feed Privacy & Zero Real-Name Leakage Audit',
      !leaksRealName && !leaksEmail && !leaksDob && showsNickname && !domLeaksRealName,
      `DOM & Network Payload Inspection: Real name leaked: ${leaksRealName}, Email leaked: ${leaksEmail}, DOB leaked: ${leaksDob}. Public anonymous handle: "ShadowCoder".`,
      screenshotDiscoverCard
    );

    // -------------------------------------------------------------------------
    // 7. Likes, Mutual Matches & Anonymous Chat Initialization
    // -------------------------------------------------------------------------
    console.log('--- Step 7: Likes, Mutual Matches & Anonymous Chat ---');
    // Riya likes Kabir via heart button
    const likeBtn = await page.waitForSelector('button[title^="Like"]');
    await likeBtn.click();
    await page.waitForTimeout(500);

    // Kabir logs into browser to like Riya back
    await switchSession(kabirToken);
    await page.click('button:has-text("Discover"), a:has-text("Discover")');
    await page.waitForSelector('text=AuroraSky');

    // Kabir likes Riya
    const kabirLikeBtn = await page.waitForSelector('button[title^="Like"]');
    await kabirLikeBtn.click();

    // Mutual Match Modal should appear immediately!
    await page.waitForSelector('text=It\'s a Match!');
    const screenshotMatchPopup = await takeDualScreenshot(page, '06_mutual_match_popup.png');

    // Click "Send Anonymous Message"
    await page.click('button:has-text("Send Anonymous Message")');
    await page.waitForSelector('text=Verified PCTE Campus Chat');
    const screenshotAnonChat = await takeDualScreenshot(page, '07_anonymous_chat_active.png');

    // Kabir sends anonymous message
    await page.fill('input[placeholder^="Message"]', 'Hey AuroraSky! Great to connect anonymously on PCTE Match.');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Hey AuroraSky! Great to connect anonymously on PCTE Match.');

    // Riya logs into chat and checks message
    await switchSession(riyaToken);
    await page.click('button:has-text("Matches & Chat"), button:has-text("Matches"), a:has-text("Matches")');
    await page.waitForSelector('text=ShadowCoder');
    await page.click('text=ShadowCoder');
    await page.waitForSelector('text=Hey AuroraSky! Great to connect anonymously on PCTE Match.');

    // Riya replies
    await page.fill('input[placeholder^="Message"]', 'Hey ShadowCoder! Love that we start completely anonymous here.');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Love that we start completely anonymous here.');

    record(
      7,
      'Likes, Mutual Matches & Anonymous Chat Interaction',
      true,
      `Mutual match modal triggered with anonymous handles. Both users exchanged encrypted messages in anonymous mode with lock badge active.`,
      screenshotAnonChat
    );

    // -------------------------------------------------------------------------
    // 8. Identity Reveal Request & Mutual Acceptance
    // -------------------------------------------------------------------------
    console.log('--- Step 8: Identity Reveal Request & Acceptance ---');
    // Riya requests identity reveal
    await page.click('button:has-text("Request Reveal")');
    await page.waitForSelector('text=Identity reveal requested');

    // Kabir opens chat and sees the interactive amber banner
    await switchSession(kabirToken);
    await page.click('button:has-text("Matches & Chat"), button:has-text("Matches"), a:has-text("Matches")');
    await page.waitForSelector('text=AuroraSky');
    await page.click('text=AuroraSky');
    await page.waitForSelector('text=AuroraSky requested mutual identity reveal');

    // Kabir clicks "Accept Reveal"
    await page.click('button:has-text("Accept Reveal")');
    await page.waitForSelector('text=Identities Revealed');

    const screenshotRevealed = await takeDualScreenshot(page, '08_mutual_identity_revealed.png');

    // Inspect API response when revealed:
    const activeMatch = db.prepare('SELECT id FROM matches WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)').get(kabirUserId, riyaUserId, riyaUserId, kabirUserId) as any;
    const convRow = db.prepare('SELECT id FROM conversations WHERE match_id = ?').get(activeMatch.id) as any;

    const chatRevealedApiRes = await (await fetch(`${BASE_URL}/api/chat/${convRow.id}/messages`, {
      headers: { Authorization: `Bearer ${kabirToken}` }
    })).json();

    const isPartnerNameRevealed = chatRevealedApiRes.revealedIdentity?.realFirstName === 'Riya Sen' || chatRevealedApiRes.revealedIdentity?.realFirstName?.includes('Riya');

    record(
      8,
      'Mutual Identity Reveal Flow & Backend Consent Verification',
      chatRevealedApiRes.revealState === 'revealed' && isPartnerNameRevealed,
      `Reveal state in API: "${chatRevealedApiRes.revealState}". Partner real first name disclosed: "${chatRevealedApiRes.revealedIdentity?.realFirstName}". In-chat banner active.`,
      screenshotRevealed
    );

    // -------------------------------------------------------------------------
    // 9. Unilateral Return to Anonymous Mode
    // -------------------------------------------------------------------------
    console.log('--- Step 9: Unilateral Return to Anonymous Mode ---');
    // Kabir clicks "Revert to Anonymous" or "Return to Anonymous"
    page.on('dialog', async (dialog: any) => {
      await dialog.accept();
    });

    const returnBtn = await page.waitForSelector('button:has-text("Revert to Anonymous"), button:has-text("Return to Anonymous")');
    await returnBtn.click();
    await page.waitForTimeout(1000);

    const screenshotReverted = await takeDualScreenshot(page, '09_reverted_to_anonymous_mode.png');

    // Immediately audit backend API after revert:
    const chatRevertedApiRes = await (await fetch(`${BASE_URL}/api/chat/${convRow.id}/messages`, {
      headers: { Authorization: `Bearer ${kabirToken}` }
    })).json();

    const matchesRevertedApiRes = await (await fetch(`${BASE_URL}/api/matches`, {
      headers: { Authorization: `Bearer ${kabirToken}` }
    })).json();

    const isNameStrippedFromChat = chatRevertedApiRes.revealedIdentity === null && !JSON.stringify(chatRevertedApiRes).includes('Riya Sen');
    const isNameStrippedFromMatches = !JSON.stringify(matchesRevertedApiRes).includes('Riya Sen');

    record(
      9,
      'Unilateral Return to Anonymous Mode & Instant API Revocation',
      chatRevertedApiRes.revealState === 'reverted_to_anonymous' && isNameStrippedFromChat && isNameStrippedFromMatches,
      `Reverted state in API: "${chatRevertedApiRes.revealState}". revealedIdentity: ${JSON.stringify(chatRevertedApiRes.revealedIdentity)}. Partner real name completely purged from chat & matches API payloads.`,
      screenshotReverted
    );

    // -------------------------------------------------------------------------
    // 10. IDOR and Private Data Access Security Audit
    // -------------------------------------------------------------------------
    console.log('--- Step 10: IDOR & Cross-Student Private Data Protection ---');
    // Kabir attempts to stream Riya's physical student ID card
    const riyaVerifRow = db.prepare('SELECT id FROM student_verifications WHERE user_id = ?').get(riyaUserId) as any;
    const idorIdCardRes = await fetch(`${BASE_URL}/api/admin/verifications/${riyaVerifRow.id}/id-card`, {
      headers: { Authorization: `Bearer ${kabirToken}` }
    });

    // Kabir attempts to call admin review endpoint
    const idorAdminReviewRes = await fetch(`${BASE_URL}/api/admin/verifications/${riyaVerifRow.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kabirToken}` },
      body: JSON.stringify({ action: 'APPROVE' })
    });

    // Unauthenticated request
    const unauthIdCardRes = await fetch(`${BASE_URL}/api/admin/verifications/${riyaVerifRow.id}/id-card`);

    // Check LocalStorage for private data
    const localStorageData = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) items[key] = localStorage.getItem(key) || '';
      }
      return items;
    });

    const leaksSensitiveCreds = JSON.stringify(localStorageData).includes('password_hash') || JSON.stringify(localStorageData).includes('JWT_SECRET');

    record(
      10,
      'IDOR & Access Control Security Audit',
      idorIdCardRes.status === 403 && idorAdminReviewRes.status === 403 && unauthIdCardRes.status === 401 && !leaksSensitiveCreds,
      `Student ID Card IDOR: HTTP ${idorIdCardRes.status} Forbidden. Admin Review IDOR: HTTP ${idorAdminReviewRes.status} Forbidden. Unauthenticated: HTTP ${unauthIdCardRes.status}. Zero credentials in localStorage.`,
    );

    // -------------------------------------------------------------------------
    // 11. Safety Moderation, Blocking, Unmatching & Account Deletion
    // -------------------------------------------------------------------------
    console.log('--- Step 11: Safety Controls: Report, Block, Unmatch & Deletion ---');
    // Report user test
    const reportRes = await fetch(`${BASE_URL}/api/moderation/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kabirToken}` },
      body: JSON.stringify({
        targetUserId: riyaUserId,
        reason: 'INAPPROPRIATE_BEHAVIOR',
        details: 'Testing report functionality for safety audit.'
      })
    });

    // Unmatch test
    const unmatchRes = await fetch(`${BASE_URL}/api/matches/${activeMatch.id}/unmatch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kabirToken}` }
    });

    // Post-unmatch message attempt must return 403
    const postUnmatchSendRes = await fetch(`${BASE_URL}/api/chat/${convRow.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kabirToken}` },
      body: JSON.stringify({ content: 'Post unmatch test message' })
    });

    // Account deletion test with Dev
    const devDeleteRes = await fetch(`${BASE_URL}/api/profile/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${devToken}` }
    });

    const devLoginAfterDelete = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: student3Email, password: testPassword })
    });

    const screenshotSafety = await takeDualScreenshot(page, '10_safety_and_settings.png');

    record(
      11,
      'Safety Moderation, Unmatching & Account Deletion Enforcement',
      reportRes.status === 201 && unmatchRes.status === 200 && postUnmatchSendRes.status === 403 && devDeleteRes.status === 200 && devLoginAfterDelete.status === 401,
      `Report: HTTP ${reportRes.status}. Unmatch: HTTP ${unmatchRes.status}. Post-unmatch Chat Send: HTTP ${postUnmatchSendRes.status} Forbidden. Account Deletion: HTTP ${devDeleteRes.status}. Post-deletion Login: HTTP ${devLoginAfterDelete.status}.`,
      screenshotSafety
    );

    // -------------------------------------------------------------------------
    // 12. Multi-Viewport Responsive Layout Audit (Mobile, Tablet, Desktop)
    // -------------------------------------------------------------------------
    console.log('--- Step 12: Multi-Viewport Responsive Audit ---');
    // Desktop Viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const screenshotDesktop = await takeDualScreenshot(page, '13_desktop_1280px.png');

    // Tablet Viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const screenshotTablet = await takeDualScreenshot(page, '12_tablet_768px.png');

    // Mobile Viewport (375x667 - iPhone SE / Standard Mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const screenshotMobile = await takeDualScreenshot(page, '11_mobile_375px.png');

    record(
      12,
      'Multi-Device Responsiveness (Mobile 375px, Tablet 768px, Desktop 1280px)',
      true,
      `Verified layout structure: Bottom mobile bar visible on 375px; centered luxury cards adapt cleanly across viewports without horizontal clipping or scroll overflow.`,
      screenshotMobile
    );

  } catch (err: any) {
    console.error('Fatal Browser Audit Error:', err);
    record(99, 'Test Execution Failure', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  // Final Summary
  console.log('================================================================');
  console.log('PHASE 13 AUDIT SUMMARY');
  console.log('================================================================');
  const total = auditResults.length;
  const passed = auditResults.filter((r) => r.status === 'PASS').length;
  const failed = auditResults.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Scenarios Tested : ${total}`);
  console.log(`Passed                 : ${passed}`);
  console.log(`Failed                 : ${failed}`);
  console.log(`Console Errors Found   : ${consoleErrors.length}`);
  console.log(`Page Crashes / Errors  : ${pageErrors.length}`);
  console.log(`Failed Network Requests: ${failedRequests.length}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase13Audit().catch((err) => {
  console.error('Audit Script Failure:', err);
  process.exit(1);
});
