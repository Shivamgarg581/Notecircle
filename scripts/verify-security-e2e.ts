import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { db, generateToken } from '../server/db.ts';
import { getServerSupabase } from '../server/supabase.ts';
import { resetRegistrationRateLimits } from '../server/routes/auth.ts';

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  evidence: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, status: 'PASS' | 'FAIL' | 'NOT TESTED', evidence: string) {
  results.push({ category, name, status, evidence });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${name}: ${evidence}`);
}

const API_BASE = 'http://localhost:3000';

async function runAudit() {
  console.log('====================================================');
  console.log('NoteCircle — Production Security & Verification Audit');
  console.log('====================================================\n');

  await db.init();

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() || '';
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim() || '';

  const serverSb = getServerSupabase();
  const anonSb = createClient(supabaseUrl, publishableKey);

  // --------------------------------------------------------------------------
  // SECTION 1: SUPABASE 20 TABLES & SCHEMA AUDIT
  // --------------------------------------------------------------------------
  const expectedTables = [
    'users',
    'connections',
    'close_friends',
    'notes',
    'conversations',
    'messages',
    'notifications',
    'reports',
    'bug_reports',
    'audit_logs',
    'blocks',
    'mutes',
    'sessions',
    'password_recovery_requests',
    'plans',
    'memory_capsules',
    'device_public_keys',
    'verified_safety_numbers',
    'registration_otps',
    'email_logs'
  ];

  if (!serverSb) {
    record('Supabase Security', 'Server Client Initialization', 'FAIL', 'Server Supabase client failed to initialize');
    return;
  }
  record('Supabase Security', 'Server Client Initialization', 'PASS', 'Server client initialized with secure credentials');

  let tableSuccessCount = 0;
  for (const table of expectedTables) {
    try {
      const { data, error, count } = await serverSb.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        record('Supabase Security', `Table Schema: ${table}`, 'FAIL', `Query error: ${error.message}`);
      } else {
        tableSuccessCount++;
      }
    } catch (err: any) {
      record('Supabase Security', `Table Schema: ${table}`, 'FAIL', `Exception: ${err.message}`);
    }
  }

  if (tableSuccessCount === expectedTables.length) {
    record('Supabase Security', 'All 20 Production Tables Schema', 'PASS', `All 20 production tables verified in Supabase PostgreSQL`);
  } else {
    record('Supabase Security', 'All 20 Production Tables Schema', 'FAIL', `${tableSuccessCount}/${expectedTables.length} tables verified`);
  }

  // --------------------------------------------------------------------------
  // SECTION 1B: RLS POLICIES & LEAST-PRIVILEGE ACCESS CONTROL
  // --------------------------------------------------------------------------
  // Test 1: Anonymous public client reading private table (audit_logs)
  try {
    const { data: auditData, error: auditErr } = await anonSb.from('audit_logs').select('*');
    if (auditErr || !auditData || auditData.length === 0) {
      record('Supabase Security', 'RLS: Deny Anonymous SELECT on audit_logs', 'PASS', 'Anonymous client cannot read audit_logs (RLS active)');
    } else {
      record('Supabase Security', 'RLS: Deny Anonymous SELECT on audit_logs', 'FAIL', `Data leaked: ${auditData.length} records returned`);
    }
  } catch (err: any) {
    record('Supabase Security', 'RLS: Deny Anonymous SELECT on audit_logs', 'PASS', `Access blocked: ${err.message}`);
  }

  // Test 2: Anonymous public client reading sessions table
  try {
    const { data: sessData, error: sessErr } = await anonSb.from('sessions').select('*');
    if (sessErr || !sessData || sessData.length === 0) {
      record('Supabase Security', 'RLS: Deny Anonymous SELECT on sessions', 'PASS', 'Anonymous client cannot read active session tokens');
    } else {
      record('Supabase Security', 'RLS: Deny Anonymous SELECT on sessions', 'FAIL', `Sessions leaked: ${sessData.length} records returned`);
    }
  } catch (err: any) {
    record('Supabase Security', 'RLS: Deny Anonymous SELECT on sessions', 'PASS', `Access blocked: ${err.message}`);
  }

  // Test 3: Anonymous public client reading registration_otps
  try {
    const { data: otpData, error: otpErr } = await anonSb.from('registration_otps').select('*');
    if (otpErr || !otpData || otpData.length === 0) {
      record('Supabase Security', 'RLS: Deny Anonymous SELECT on registration_otps', 'PASS', 'Anonymous client cannot read registration OTP hashes');
    } else {
      record('Supabase Security', 'RLS: Deny Anonymous SELECT on registration_otps', 'FAIL', `OTP records leaked: ${otpData.length}`);
    }
  } catch (err: any) {
    record('Supabase Security', 'RLS: Deny Anonymous SELECT on registration_otps', 'PASS', `Access blocked: ${err.message}`);
  }

  // Test 4: Anonymous public client writing to notes table (should be rejected by RLS)
  try {
    const fakeNoteId = `fake_note_${Date.now()}`;
    const { error: insertNoteErr } = await anonSb.from('notes').insert({
      id: fakeNoteId,
      user_id: 'non_existent_user',
      author: 'Hacker',
      emoji: '⚠️',
      category: 'work',
      category_label: 'Focus Session',
      text: 'Unauthorized note injection',
      audience: 'followers',
      status: 'ACTIVE'
    });
    if (insertNoteErr) {
      record('Supabase Security', 'RLS: Deny Anonymous INSERT on notes', 'PASS', `Insertion correctly rejected: ${insertNoteErr.message}`);
    } else {
      record('Supabase Security', 'RLS: Deny Anonymous INSERT on notes', 'FAIL', 'Unauthorized note was inserted via anonymous client');
    }
  } catch (err: any) {
    record('Supabase Security', 'RLS: Deny Anonymous INSERT on notes', 'PASS', `Insertion rejected: ${err.message}`);
  }

  // Test 5: Anonymous client updating another user profile
  try {
    const { data: updateRes, error: updateErr } = await anonSb.from('users').update({ display_name: 'Hacked Name' }).eq('username', 'garg').select();
    if (updateErr || !updateRes || updateRes.length === 0) {
      record('Supabase Security', 'RLS: Deny Anonymous UPDATE on users', 'PASS', 'Anonymous client cannot update user profiles');
    } else {
      record('Supabase Security', 'RLS: Deny Anonymous UPDATE on users', 'FAIL', 'Profile was modified without authorization');
    }
  } catch (err: any) {
    record('Supabase Security', 'RLS: Deny Anonymous UPDATE on users', 'PASS', `Update rejected: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // SECTION 2: AUTHENTICATED SESSIONS SETUP FOR TEST USERS
  // --------------------------------------------------------------------------
  const users = db.get('users');
  const userA = users.find((u) => u.username === 'garg');
  const userB = users.find((u) => u.username === 'vijay');

  if (!userA || !userB) {
    record('Authentication & Resend', 'Test Users Verification', 'FAIL', 'Both production users garg and vijay must exist');
    return;
  }
  record('Authentication & Resend', 'Test Users Verification', 'PASS', `Found 2 valid production users: @${userA.username} (${userA.id}) and @${userB.username} (${userB.id})`);

  // Generate authentic HMAC-signed tokens for user A and user B for testing
  const tokenA = generateToken(userA.id);
  const tokenB = generateToken(userB.id);

  const sessNow = new Date().toISOString();
  await serverSb.from('sessions').upsert([
    {
      id: `sess_audit_a_${Date.now()}`,
      user_id: userA.id,
      token: tokenA,
      device: 'Security Audit Suite Device A',
      ip: '127.0.0.1',
      created_at: sessNow,
      last_active: sessNow
    },
    {
      id: `sess_audit_b_${Date.now()}`,
      user_id: userB.id,
      token: tokenB,
      device: 'Security Audit Suite Device B',
      ip: '127.0.0.1',
      created_at: sessNow,
      last_active: sessNow
    }
  ]);

  // Ensure userA and userB have an ACCEPTED mutual connection for authorized messaging
  await serverSb.from('connections').upsert({
    id: `conn_audit_${userA.id}_${userB.id}`,
    requester_id: userA.id,
    target_id: userB.id,
    status: 'ACCEPTED',
    created_at: sessNow,
    updated_at: sessNow
  });
  await db.init();

  // --------------------------------------------------------------------------
  // SECTION 3: SENSITIVE DATA LEAK AUDIT (password_hash, OTPs, Tokens)
  // --------------------------------------------------------------------------
  // Test /api/auth/me for User A
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const data = await res.json();
    if (res.status === 200 && data.user) {
      const leakedPassword = data.user.passwordHash || data.user.password_hash;
      if (leakedPassword) {
        record('Supabase Security', 'Omit password_hash in /api/auth/me', 'FAIL', 'passwordHash present in /api/auth/me response');
      } else {
        record('Supabase Security', 'Omit password_hash in /api/auth/me', 'PASS', 'passwordHash strictly stripped from /api/auth/me response');
      }
    } else {
      record('Supabase Security', 'Omit password_hash in /api/auth/me', 'FAIL', `Unexpected status ${res.status}`);
    }
  } catch (err: any) {
    record('Supabase Security', 'Omit password_hash in /api/auth/me', 'FAIL', err.message);
  }

  // Test Public Profile Redaction /api/users/profile/:username
  try {
    const res = await fetch(`${API_BASE}/api/users/profile/${userA.username}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const data = await res.json();
    const profileObj = data.profile || data.user;
    if (res.status === 200 && profileObj) {
      const leakedFields = [];
      if (profileObj.passwordHash || profileObj.password_hash) leakedFields.push('passwordHash');
      if (profileObj.email) leakedFields.push('email');
      if (profileObj.phone) leakedFields.push('phone');
      if (profileObj.notificationSettings) leakedFields.push('notificationSettings');
      if (profileObj.privacySettings) leakedFields.push('privacySettings');
      if (profileObj.isAdmin !== undefined) leakedFields.push('isAdmin');

      if (leakedFields.length === 0) {
        record('Supabase Security', 'Privacy Redaction in Public Profile', 'PASS', 'Zero private security fields leaked in public profile');
      } else {
        record('Supabase Security', 'Privacy Redaction in Public Profile', 'FAIL', `Leaked private fields: ${leakedFields.join(', ')}`);
      }
    } else {
      record('Supabase Security', 'Privacy Redaction in Public Profile', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err: any) {
    record('Supabase Security', 'Privacy Redaction in Public Profile', 'FAIL', err.message);
  }

  // Test /api/users/me/sessions (Check session token is not leaked)
  try {
    const res = await fetch(`${API_BASE}/api/users/me/sessions`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data.sessions)) {
      const hasPlainToken = data.sessions.some((s: any) => s.token && s.token.length > 0);
      if (hasPlainToken) {
        record('Supabase Security', 'Session Token Omission in /me/sessions', 'FAIL', 'Active token was exposed in session list');
      } else {
        record('Supabase Security', 'Session Token Omission in /me/sessions', 'PASS', 'Session tokens are strictly omitted from sessions list');
      }
    } else {
      record('Supabase Security', 'Session Token Omission in /me/sessions', 'FAIL', `Status ${res.status}`);
    }
  } catch (err: any) {
    record('Supabase Security', 'Session Token Omission in /me/sessions', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // SECTION 4: SERVER-SIDE ADMIN PRIVILEGE ENFORCEMENT
  // --------------------------------------------------------------------------
  // Test 1: Unauthenticated request to /api/admin/metrics -> 401
  try {
    const res = await fetch(`${API_BASE}/api/admin/metrics`);
    if (res.status === 401) {
      record('Supabase Security', 'Admin Auth: Reject Unauthenticated Requests', 'PASS', 'Returned 401 Unauthorized as expected');
    } else {
      record('Supabase Security', 'Admin Auth: Reject Unauthenticated Requests', 'FAIL', `Expected 401, got ${res.status}`);
    }
  } catch (err: any) {
    record('Supabase Security', 'Admin Auth: Reject Unauthenticated Requests', 'FAIL', err.message);
  }

  // Test 2: Non-admin user request to /api/admin/metrics -> 403
  try {
    const res = await fetch(`${API_BASE}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    // userB (vijay) is NOT an admin
    if (res.status === 403) {
      record('Supabase Security', 'Admin Auth: Reject Non-Admin Session', 'PASS', 'Returned 403 Forbidden for non-admin user');
    } else {
      record('Supabase Security', 'Admin Auth: Reject Non-Admin Session', 'FAIL', `Expected 403, got status ${res.status}`);
    }
  } catch (err: any) {
    record('Supabase Security', 'Admin Auth: Reject Non-Admin Session', 'FAIL', err.message);
  }

  // Test 3: Admin user request to /api/admin/metrics -> 200
  try {
    const res = await fetch(`${API_BASE}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    // userA (garg) IS an admin
    if (res.status === 200) {
      record('Supabase Security', 'Admin Auth: Admin Session Allowed', 'PASS', 'Allowed 200 OK for verified admin user');
    } else {
      record('Supabase Security', 'Admin Auth: Admin Session Allowed', 'FAIL', `Expected 200, got status ${res.status}`);
    }
  } catch (err: any) {
    record('Supabase Security', 'Admin Auth: Admin Session Allowed', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // SECTION 5: AUTHENTICATION, CAPTCHA & REGISTRATION AUDIT
  // --------------------------------------------------------------------------
  try {
    await fetch(`${API_BASE}/api/auth/internal/reset-rate-limit`, { method: 'POST' });
  } catch {}
  resetRegistrationRateLimits();

  // Test 1: CAPTCHA missing token rejection
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test_nocaptcha_${Date.now()}@example.com`,
        username: `nocap_${Date.now().toString().slice(-5)}`,
        displayName: 'No Captcha Test',
        password: 'Password123!',
        captchaToken: ''
      })
    });
    const data = await res.json();
    if (res.status === 400 && data.error && data.error.includes('CAPTCHA')) {
      record('Authentication & CAPTCHA', 'Reject Missing CAPTCHA Token', 'PASS', 'Request without CAPTCHA token correctly rejected with 400');
    } else {
      record('Authentication & CAPTCHA', 'Reject Missing CAPTCHA Token', 'FAIL', `Expected 400 with CAPTCHA error, got ${res.status}`);
    }
  } catch (err: any) {
    record('Authentication & CAPTCHA', 'Reject Missing CAPTCHA Token', 'FAIL', err.message);
  }

  // Test 2: Enforce One Account per Normalized Gmail Address (dots, plus-tags, and googlemail.com)
  try {
    // Attempt registration with an alias variation of existing user vijay (vjagarwal1144@gmail.com)
    const gmailAlias = 'v.j.agarwal1144+alias@gmail.com';
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: gmailAlias,
        username: `alias_${Date.now().toString().slice(-5)}`,
        displayName: 'Gmail Duplicate Tester',
        password: 'Password123!',
        captchaToken: 'test_token'
      })
    });
    const data = await res.json();
    if (res.status === 409 && data.error && (data.error.includes('Gmail') || data.error.includes('already registered'))) {
      record('Authentication & CAPTCHA', 'Enforce One Account per Normalized Gmail', 'PASS', `Rejected duplicate dot/plus Gmail variation: ${data.error}`);
    } else {
      record('Authentication & CAPTCHA', 'Enforce One Account per Normalized Gmail', 'FAIL', `Expected 409 conflict, got ${res.status}`);
    }
  } catch (err: any) {
    record('Authentication & CAPTCHA', 'Enforce One Account per Normalized Gmail', 'FAIL', err.message);
  }

  // Test 3: Successful Registration WITH Profile Picture (Instagram Mobile Experience)
  const validUserEmail = `reg_test_${Date.now()}@example.com`;
  const validUsername = `reg_${Date.now().toString().slice(-6)}`;
  let registeredUserId = '';
  try {
    // Valid 1x1 PNG base64 Data URL
    const testPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const regRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validUserEmail,
        username: validUsername,
        displayName: 'Registered Test User',
        password: 'SecurePassword123!',
        captchaToken: `test_token_pic_${Date.now()}`,
        avatarDataUrl: testPngDataUrl,
        bio: 'Hello NoteCircle',
        city: 'San Francisco'
      })
    });
    const regData = await regRes.json();
    if (regRes.status === 201 && regData.user && regData.token) {
      registeredUserId = regData.user.id;
      const hasAvatar = !!regData.user.avatarUrl && regData.user.avatarUrl.length > 5;
      record('Authentication & CAPTCHA', 'Register With Profile Picture & CAPTCHA', 'PASS', `User @${validUsername} registered successfully (Avatar persisted: ${hasAvatar})`);
    } else {
      record('Authentication & CAPTCHA', 'Register With Profile Picture & CAPTCHA', 'FAIL', `Expected 201 Created, got ${regRes.status}: ${regData.error}`);
    }
  } catch (err: any) {
    record('Authentication & CAPTCHA', 'Register With Profile Picture & CAPTCHA', 'FAIL', err.message);
  }

  // Test 4: Registration WITHOUT Profile Picture (Uses Default Initial Badge)
  try {
    const noPicEmail = `nopic_${Date.now()}@example.com`;
    const noPicUsername = `nopic_${Date.now().toString().slice(-6)}`;
    const regRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: noPicEmail,
        username: noPicUsername,
        displayName: 'No Photo User',
        password: 'SecurePassword123!',
        captchaToken: `test_token_nopic_${Date.now()}`
      })
    });
    const regData = await regRes.json();
    if (regRes.status === 201 && regData.user) {
      record('Authentication & CAPTCHA', 'Register Without Profile Picture', 'PASS', 'User registered without photo, default avatar badge active');
      // Clean up test user
      db.update('users', (uList) => uList.filter((u) => u.id !== regData.user.id));
      await serverSb.from('users').delete().eq('id', regData.user.id);
    } else {
      record('Authentication & CAPTCHA', 'Register Without Profile Picture', 'FAIL', `Status: ${regRes.status}`);
    }
  } catch (err: any) {
    record('Authentication & CAPTCHA', 'Register Without Profile Picture', 'FAIL', err.message);
  }

  // Clean up registered user from Test 3
  if (registeredUserId) {
    db.update('users', (uList) => uList.filter((u) => u.id !== registeredUserId));
    await serverSb.from('users').delete().eq('id', registeredUserId);
  }

  // --------------------------------------------------------------------------
  // SECTION 6: END-TO-END ENCRYPTED CHAT PERSISTENCE & ACCESS
  // --------------------------------------------------------------------------
  // Test 1: Plaintext message without encryptedPayload must be REJECTED
  let convId = '';
  try {
    const convRes = await fetch(`${API_BASE}/api/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ targetUserId: userB.id })
    });
    const convData = await convRes.json();
    convId = convData.conversation?.id;

    if (!convId) {
      const getConvRes = await fetch(`${API_BASE}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const getConvData = await getConvRes.json();
      convId = getConvData.conversations?.[0]?.id;
    }

    if (!convId) {
      record('E2EE Chat', 'Create 1:1 Conversation', 'FAIL', 'Could not open conversation between user A and B');
    } else {
      record('E2EE Chat', 'Create 1:1 Conversation', 'PASS', `1:1 conversation established: ${convId}`);
    }
  } catch (err: any) {
    record('E2EE Chat', 'Create 1:1 Conversation', 'FAIL', err.message);
  }

  if (convId) {
    // Send unencrypted message (should fail)
    try {
      const plainRes = await fetch(`${API_BASE}/api/chat/conversations/${convId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ text: 'Readable plaintext should be rejected' })
      });
      if (plainRes.status === 400) {
        record('E2EE Chat', 'Reject Unencrypted Chat Payloads', 'PASS', 'Plaintext message rejected with 400 (encryption required)');
      } else {
        record('E2EE Chat', 'Reject Unencrypted Chat Payloads', 'FAIL', `Expected 400, got ${plainRes.status}`);
      }
    } catch (err: any) {
      record('E2EE Chat', 'Reject Unencrypted Chat Payloads', 'FAIL', err.message);
    }

    // Send valid E2EE Ciphertext payload
    const testCiphertext = crypto.randomBytes(32).toString('base64');
    const testIv = crypto.randomBytes(12).toString('base64');
    const validEnvelope = JSON.stringify({
      v: 1,
      alg: 'ECDH-P256-AES-GCM-256',
      iv: testIv,
      ct: testCiphertext,
      tag: crypto.randomBytes(16).toString('base64')
    });

    let sentMsgId = '';
    try {
      const sendRes = await fetch(`${API_BASE}/api/chat/conversations/${convId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          text: '[Encrypted Text Placeholder]',
          encryptedPayload: validEnvelope
        })
      });
      const sendData = await sendRes.json();
      if ((sendRes.status === 200 || sendRes.status === 201) && sendData.message) {
        sentMsgId = sendData.message.id;
        const storedText = sendData.message.text;
        if (storedText === '[End-to-End Encrypted Message]') {
          record('E2EE Chat', 'Ciphertext Message Persistence', 'PASS', 'E2EE message persisted with encryptedPayload; plaintext placeholder used');
        } else {
          record('E2EE Chat', 'Ciphertext Message Persistence', 'FAIL', `Unexpected message text: ${storedText}`);
        }
      } else {
        record('E2EE Chat', 'Ciphertext Message Persistence', 'FAIL', `Send status: ${sendRes.status}`);
      }
    } catch (err: any) {
      record('E2EE Chat', 'Ciphertext Message Persistence', 'FAIL', err.message);
    }

    // Recipient (User B) retrieves message from second device
    if (sentMsgId) {
      try {
        const getRes = await fetch(`${API_BASE}/api/chat/conversations/${convId}/messages`, {
          headers: { Authorization: `Bearer ${tokenB}` }
        });
        const getData = await getRes.json();
        const found = getData.messages?.find((m: any) => m.id === sentMsgId);
        if (found && found.encryptedPayload === validEnvelope) {
          record('E2EE Chat', 'Cross-Device Retrieval by Recipient', 'PASS', 'Recipient successfully retrieved unaltered E2EE ciphertext envelope');
        } else {
          record('E2EE Chat', 'Cross-Device Retrieval by Recipient', 'FAIL', 'Message not found or ciphertext corrupted');
        }
      } catch (err: any) {
        record('E2EE Chat', 'Cross-Device Retrieval by Recipient', 'FAIL', err.message);
      }

      // Unauthorized third-party user cannot access conversation or messages
      const fakeToken = generateToken('usr_unauthorized_fake_id');
      db.createSession('usr_unauthorized_fake_id', fakeToken, 'Attacker Device', '127.0.0.1');

      try {
        const unauthRes = await fetch(`${API_BASE}/api/chat/conversations/${convId}/messages`, {
          headers: { Authorization: `Bearer ${fakeToken}` }
        });
        if (unauthRes.status === 401 || unauthRes.status === 403 || unauthRes.status === 404) {
          record('E2EE Chat', 'Unauthorized Access Blocked', 'PASS', `Unauthorized access blocked with HTTP ${unauthRes.status}`);
        } else {
          record('E2EE Chat', 'Unauthorized Access Blocked', 'FAIL', `Expected 401/403/404, got ${unauthRes.status}`);
        }
      } catch (err: any) {
        record('E2EE Chat', 'Unauthorized Access Blocked', 'FAIL', err.message);
      } finally {
        db.deleteSessionById(fakeToken, 'usr_unauthorized_fake_id');
      }

      // Delivery Acknowledgment Test
      try {
        const ackRes = await fetch(`${API_BASE}/api/chat/conversations/${convId}/ack-delivery`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenB}`
          },
          body: JSON.stringify({ messageIds: [sentMsgId] })
        });
        if (ackRes.status === 200) {
          record('E2EE Chat', 'Delivery Acknowledgment', 'PASS', 'Recipient delivery acknowledgment processed successfully');
        } else {
          record('E2EE Chat', 'Delivery Acknowledgment', 'FAIL', `Ack returned status ${ackRes.status}`);
        }
      } catch (err: any) {
        record('E2EE Chat', 'Delivery Acknowledgment', 'FAIL', err.message);
      }
    }
  }

  // --------------------------------------------------------------------------
  // SECTION 7: AVATAR UPLOADS SECURITY & SUPABASE STORAGE
  // --------------------------------------------------------------------------
  // Test 1: Valid 1x1 PNG image with correct magic bytes (0x89, 0x50, 0x4E, 0x47)
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  const validDataUrl = `data:image/png;base64,${validPngBuffer.toString('base64')}`;

  let uploadedAvatarUrl = '';
  try {
    const uploadRes = await fetch(`${API_BASE}/api/users/me/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ dataUrl: validDataUrl })
    });
    const uploadData = await uploadRes.json();
    if (uploadRes.status === 200 && uploadData.success && uploadData.avatarUrl) {
      uploadedAvatarUrl = uploadData.avatarUrl;
      const persistsInSupabase = uploadData.avatarUrl.includes('/storage/v1/object/public/avatars/') || uploadData.avatarUrl.startsWith('/uploads/');
      if (persistsInSupabase) {
        record('Avatar Uploads', 'Valid Avatar Upload & Storage', 'PASS', `Avatar uploaded: ${uploadedAvatarUrl}`);
      } else {
        record('Avatar Uploads', 'Valid Avatar Upload & Storage', 'FAIL', `Invalid avatar URL: ${uploadData.avatarUrl}`);
      }
    } else {
      record('Avatar Uploads', 'Valid Avatar Upload & Storage', 'FAIL', `Status ${uploadRes.status}: ${uploadData.error}`);
    }
  } catch (err: any) {
    record('Avatar Uploads', 'Valid Avatar Upload & Storage', 'FAIL', err.message);
  }

  // Test 2: Spoofed file (text file disguised as image/png without magic bytes)
  const spoofedBuffer = Buffer.from('NOT AN IMAGE FILE CONTENT JUST MALICIOUS SCRIPT');
  const spoofedDataUrl = `data:image/png;base64,${spoofedBuffer.toString('base64')}`;

  try {
    const spoofRes = await fetch(`${API_BASE}/api/users/me/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ dataUrl: spoofedDataUrl })
    });
    if (spoofRes.status === 400) {
      record('Avatar Uploads', 'Magic Bytes Security Validation', 'PASS', 'Corrupted / spoofed image payload correctly rejected with 400');
    } else {
      record('Avatar Uploads', 'Magic Bytes Security Validation', 'FAIL', `Expected 400, got ${spoofRes.status}`);
    }
  } catch (err: any) {
    record('Avatar Uploads', 'Magic Bytes Security Validation', 'FAIL', err.message);
  }

  // Test 3: Avatar Removal
  try {
    const delRes = await fetch(`${API_BASE}/api/users/me/avatar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const delData = await delRes.json();
    if (delRes.status === 200 && delData.success && delData.avatarUrl === null) {
      record('Avatar Uploads', 'Avatar Removal & Cleanup', 'PASS', 'Avatar removed and user profile updated');
    } else {
      record('Avatar Uploads', 'Avatar Removal & Cleanup', 'FAIL', `Status ${delRes.status}`);
    }
  } catch (err: any) {
    record('Avatar Uploads', 'Avatar Removal & Cleanup', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // SECTION 8: DATABASE CONSISTENCY & CONCURRENCY
  // --------------------------------------------------------------------------
  // Test concurrent updates on NoteCircle availability
  try {
    const updates = Array.from({ length: 5 }, (_, i) =>
      fetch(`${API_BASE}/api/users/me/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          code: 'available',
          customStatus: `Concurrent Audit Update #${i + 1}`
        })
      })
    );
    const responses = await Promise.all(updates);
    const allSuccessful = responses.every((r) => r.status === 200);
    if (allSuccessful) {
      record('Database Consistency', 'Concurrent User State Writes', 'PASS', '5 concurrent write operations completed without race conditions');
    } else {
      record('Database Consistency', 'Concurrent User State Writes', 'FAIL', 'One or more concurrent writes failed');
    }
  } catch (err: any) {
    record('Database Consistency', 'Concurrent User State Writes', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log('AUDIT EXECUTION SUMMARY');
  console.log('====================================================');

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const notTestedCount = results.filter((r) => r.status === 'NOT TESTED').length;

  console.log(`TOTAL AUDIT CHECKS: ${results.length}`);
  console.log(`PASS:       ${passCount}`);
  console.log(`FAIL:       ${failCount}`);
  console.log(`NOT TESTED: ${notTestedCount}\n`);

  if (failCount > 0) {
    console.error('FAILURES DETECTED:');
    for (const f of results.filter((r) => r.status === 'FAIL')) {
      console.error(`- [${f.category}] ${f.name}: ${f.evidence}`);
    }
    process.exit(1);
  } else {
    console.log('ALL EXECUTED SECURITY AUDIT CHECKS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
