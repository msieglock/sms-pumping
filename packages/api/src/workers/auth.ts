import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from '../types';
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  generateAPIKey,
  hashAPIKey
} from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://app.smsguard.dev', 'https://smsguard-web.pages.dev'],
  credentials: true,
}));

// Register new organization and user
app.post('/register', async (c) => {
  const body = await c.req.json<{
    email: string;
    password: string;
    name: string;
    company_name: string;
    website?: string;
  }>();

  // Validate
  if (!body.email || !body.password || !body.name || !body.company_name) {
    return c.json({
      success: false,
      error: { code: 'invalid_request', message: 'Missing required fields' }
    }, 400);
  }

  // Check if email exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(body.email.toLowerCase()).first();

  if (existing) {
    return c.json({
      success: false,
      error: { code: 'email_exists', message: 'Email already registered' }
    }, 400);
  }

  // Create organization
  const orgId = `org_${crypto.randomUUID().replace(/-/g, '')}`;
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  await c.env.DB.prepare(`
    INSERT INTO organizations (id, name, website, plan, trial_ends_at)
    VALUES (?, ?, ?, 'trial', ?)
  `).bind(orgId, body.company_name, body.website || null, trialEndsAt.toISOString()).run();

  // Create user
  const userId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
  const passwordHash = await hashPassword(body.password);

  await c.env.DB.prepare(`
    INSERT INTO users (id, org_id, email, password_hash, role)
    VALUES (?, ?, ?, ?, 'admin')
  `).bind(userId, orgId, body.email.toLowerCase(), passwordHash).run();

  // Generate API keys
  const testKey = generateAPIKey('test');
  const liveKey = generateAPIKey('live');

  await c.env.DB.prepare(`
    INSERT INTO api_keys (id, org_id, key_hash, key_prefix, name, environment)
    VALUES (?, ?, ?, ?, 'Default Test Key', 'test')
  `).bind(
    `key_${crypto.randomUUID().replace(/-/g, '')}`,
    orgId,
    await hashAPIKey(testKey),
    testKey.slice(0, 12)
  ).run();

  await c.env.DB.prepare(`
    INSERT INTO api_keys (id, org_id, key_hash, key_prefix, name, environment)
    VALUES (?, ?, ?, ?, 'Default Live Key', 'live')
  `).bind(
    `key_${crypto.randomUUID().replace(/-/g, '')}`,
    orgId,
    await hashAPIKey(liveKey),
    liveKey.slice(0, 12)
  ).run();

  // Generate JWT
  const token = await generateJWT(c.env, userId, orgId, 'admin');

  return c.json({
    success: true,
    data: {
      user: {
        id: userId,
        email: body.email.toLowerCase(),
        name: body.name,
        role: 'admin'
      },
      organization: {
        id: orgId,
        name: body.company_name,
        plan: 'trial',
        trial_ends_at: trialEndsAt.toISOString()
      },
      api_keys: {
        test: testKey,
        live: liveKey
      },
      token
    }
  });
});

// Login
app.post('/login', async (c) => {
  const body = await c.req.json<{
    email: string;
    password: string;
  }>();

  const user = await c.env.DB.prepare(`
    SELECT u.id, u.org_id, u.email, u.password_hash, u.role, o.name as org_name, o.plan
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    WHERE u.email = ?
  `).bind(body.email.toLowerCase()).first<{
    id: string;
    org_id: string;
    email: string;
    password_hash: string;
    role: string;
    org_name: string;
    plan: string;
  }>();

  if (!user) {
    return c.json({
      success: false,
      error: { code: 'invalid_credentials', message: 'Invalid email or password' }
    }, 401);
  }

  const validPassword = await verifyPassword(body.password, user.password_hash);
  if (!validPassword) {
    return c.json({
      success: false,
      error: { code: 'invalid_credentials', message: 'Invalid email or password' }
    }, 401);
  }

  const token = await generateJWT(c.env, user.id, user.org_id, user.role);

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      organization: {
        id: user.org_id,
        name: user.org_name,
        plan: user.plan
      },
      token
    }
  });
});

// Get current user
app.get('/me', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: { code: 'authentication_error', message: 'Missing token' }
    }, 401);
  }

  // Verify and decode token
  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  try {
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(auth.slice(7), secret);

    const user = await c.env.DB.prepare(`
      SELECT u.id, u.email, u.role, o.id as org_id, o.name as org_name, o.plan, o.trial_ends_at, o.onboarding_completed
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = ?
    `).bind(payload.sub).first();

    if (!user) {
      return c.json({
        success: false,
        error: { code: 'user_not_found', message: 'User not found' }
      }, 404);
    }

    return c.json({
      success: true,
      data: user
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'invalid_token', message: 'Invalid or expired token' }
    }, 401);
  }
});

// Mark onboarding as complete
app.post('/onboarding/complete', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: { code: 'authentication_error', message: 'Missing token' }
    }, 401);
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  try {
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(auth.slice(7), secret);

    await c.env.DB.prepare(`
      UPDATE organizations SET onboarding_completed = 1 WHERE id = ?
    `).bind(payload.org).run();

    return c.json({
      success: true,
      data: { onboarding_completed: true }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'invalid_token', message: 'Invalid or expired token' }
    }, 401);
  }
});

// Get API keys
app.get('/api-keys', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: { code: 'authentication_error', message: 'Missing token' }
    }, 401);
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  try {
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(auth.slice(7), secret);

    const keys = await c.env.DB.prepare(`
      SELECT id, key_prefix, name, environment, last_used_at, created_at
      FROM api_keys
      WHERE org_id = ?
    `).bind(payload.org).all();

    return c.json({
      success: true,
      data: keys.results
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'invalid_token', message: 'Invalid or expired token' }
    }, 401);
  }
});

// ============================================
// Google OAuth
// ============================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// Initiate Google OAuth
app.get('/google', async (c) => {
  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`;
  const state = crypto.randomUUID();

  // Store state in KV for CSRF protection (expires in 10 minutes)
  await c.env.CACHE.put(`oauth_state:${state}`, 'valid', { expirationTtl: 600 });

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// Google OAuth callback
app.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  const frontendUrl = c.env.ENVIRONMENT === 'production'
    ? 'https://app.smsguard.ai'
    : 'http://localhost:5173';

  if (error) {
    return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.redirect(`${frontendUrl}/login?error=missing_params`);
  }

  // Verify state for CSRF protection
  const storedState = await c.env.CACHE.get(`oauth_state:${state}`);
  if (!storedState) {
    return c.redirect(`${frontendUrl}/login?error=invalid_state`);
  }
  await c.env.CACHE.delete(`oauth_state:${state}`);

  try {
    // Exchange code for tokens
    const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`;
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return c.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json<{ access_token: string; id_token: string }>();

    // Get user info from Google
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      return c.redirect(`${frontendUrl}/login?error=userinfo_failed`);
    }

    const googleUser = await userInfoResponse.json<{
      id: string;
      email: string;
      name: string;
      picture: string;
    }>();

    // Check if user exists
    let user = await c.env.DB.prepare(`
      SELECT u.id, u.org_id, u.email, u.role, o.name as org_name, o.plan
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.email = ? OR u.google_id = ?
    `).bind(googleUser.email.toLowerCase(), googleUser.id).first<{
      id: string;
      org_id: string;
      email: string;
      role: string;
      org_name: string;
      plan: string;
    }>();

    if (!user) {
      // Create new user and organization
      const orgId = `org_${crypto.randomUUID().replace(/-/g, '')}`;
      const userId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      // Extract company name from email domain or use user's name
      const emailDomain = googleUser.email.split('@')[1];
      const companyName = emailDomain.split('.')[0].charAt(0).toUpperCase() + emailDomain.split('.')[0].slice(1);

      await c.env.DB.prepare(`
        INSERT INTO organizations (id, name, plan, trial_ends_at)
        VALUES (?, ?, 'trial', ?)
      `).bind(orgId, companyName, trialEndsAt.toISOString()).run();

      await c.env.DB.prepare(`
        INSERT INTO users (id, org_id, email, password_hash, google_id, name, avatar_url, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'admin')
      `).bind(userId, orgId, googleUser.email.toLowerCase(), 'OAUTH_USER', googleUser.id, googleUser.name, googleUser.picture).run();

      // Generate API keys
      const testKey = generateAPIKey('test');
      const liveKey = generateAPIKey('live');

      await c.env.DB.prepare(`
        INSERT INTO api_keys (id, org_id, key_hash, key_prefix, name, environment)
        VALUES (?, ?, ?, ?, 'Default Test Key', 'test')
      `).bind(
        `key_${crypto.randomUUID().replace(/-/g, '')}`,
        orgId,
        await hashAPIKey(testKey),
        testKey.slice(0, 12)
      ).run();

      await c.env.DB.prepare(`
        INSERT INTO api_keys (id, org_id, key_hash, key_prefix, name, environment)
        VALUES (?, ?, ?, ?, 'Default Live Key', 'live')
      `).bind(
        `key_${crypto.randomUUID().replace(/-/g, '')}`,
        orgId,
        await hashAPIKey(liveKey),
        liveKey.slice(0, 12)
      ).run();

      user = {
        id: userId,
        org_id: orgId,
        email: googleUser.email.toLowerCase(),
        role: 'admin',
        org_name: companyName,
        plan: 'trial',
      };
    } else {
      // Update Google ID if not set
      await c.env.DB.prepare(`
        UPDATE users SET google_id = ?, name = COALESCE(name, ?), avatar_url = ? WHERE id = ?
      `).bind(googleUser.id, googleUser.name, googleUser.picture, user.id).run();
    }

    // Generate JWT
    const token = await generateJWT(c.env, user.id, user.org_id, user.role);

    // Redirect to frontend with token
    return c.redirect(`${frontendUrl}/auth/callback?token=${token}`);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google OAuth error:', errorMessage, err);
    return c.redirect(`${frontendUrl}/login?error=oauth_failed&details=${encodeURIComponent(errorMessage)}`);
  }
});

// Rotate API key
app.post('/api-keys/:id/rotate', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: { code: 'authentication_error', message: 'Missing token' }
    }, 401);
  }

  const keyId = c.req.param('id');
  const secret = new TextEncoder().encode(c.env.JWT_SECRET);

  try {
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(auth.slice(7), secret);

    // Verify key belongs to org
    const existingKey = await c.env.DB.prepare(`
      SELECT environment FROM api_keys WHERE id = ? AND org_id = ?
    `).bind(keyId, payload.org).first<{ environment: 'test' | 'live' }>();

    if (!existingKey) {
      return c.json({
        success: false,
        error: { code: 'not_found', message: 'API key not found' }
      }, 404);
    }

    // Generate new key
    const newKey = generateAPIKey(existingKey.environment);
    const newHash = await hashAPIKey(newKey);

    await c.env.DB.prepare(`
      UPDATE api_keys SET key_hash = ?, key_prefix = ? WHERE id = ?
    `).bind(newHash, newKey.slice(0, 12), keyId).run();

    return c.json({
      success: true,
      data: {
        id: keyId,
        key: newKey,
        key_prefix: newKey.slice(0, 12)
      }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'invalid_token', message: 'Invalid or expired token' }
    }, 401);
  }
});

export default app;
