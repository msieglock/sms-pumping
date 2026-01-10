import { Env, JWTPayload, APIKey } from '../types';
import * as jose from 'jose';

// Hash API key for storage
export async function hashAPIKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate new API key
export function generateAPIKey(environment: 'test' | 'live'): string {
  const prefix = environment === 'live' ? 'sk_live_' : 'sk_test_';
  const random = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  return prefix + random;
}

// Verify API key and return key data
export async function verifyAPIKey(
  db: D1Database,
  apiKey: string
): Promise<{ id: string; org_id: string; environment: string } | null> {
  if (!apiKey || !apiKey.startsWith('sk_')) {
    return null;
  }

  const keyHash = await hashAPIKey(apiKey);

  const result = await db.prepare(
    'SELECT id, org_id, environment FROM api_keys WHERE key_hash = ?'
  ).bind(keyHash).first<{ id: string; org_id: string; environment: string }>();

  return result || null;
}

// Generate JWT token
export async function generateJWT(
  env: Env,
  userId: string,
  orgId: string,
  role: string
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const jwt = await new jose.SignJWT({
    sub: userId,
    org: orgId,
    role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return jwt;
}

// Verify JWT token
export async function verifyJWT(
  env: Env,
  authHeader: string
): Promise<JWTPayload | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      org: payload.org as string,
      role: payload.role as string,
      iat: payload.iat as number,
      exp: payload.exp as number
    };
  } catch {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'smsguard_salt_v1');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify password
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// Create user session
export async function createSession(
  db: D1Database,
  userId: string
): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await hashAPIKey(token); // Reuse hash function
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(
    `sess_${crypto.randomUUID().replace(/-/g, '')}`,
    userId,
    tokenHash,
    expiresAt.toISOString()
  ).run();

  return token;
}

// Verify session
export async function verifySession(
  db: D1Database,
  token: string
): Promise<{ user_id: string; org_id: string; role: string } | null> {
  const tokenHash = await hashAPIKey(token);

  const result = await db.prepare(`
    SELECT s.user_id, u.org_id, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ?
    AND s.expires_at > datetime('now')
  `).bind(tokenHash).first<{ user_id: string; org_id: string; role: string }>();

  return result || null;
}

// Rate limiting check
export async function checkRateLimit(
  limiter: DurableObjectNamespace,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const id = limiter.idFromName(key);
  const obj = limiter.get(id);

  const response = await obj.fetch(new Request('http://internal/check', {
    method: 'POST',
    body: JSON.stringify({ limit, windowMs })
  }));

  return response.json();
}
