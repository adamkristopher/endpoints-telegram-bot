import Keyv from 'keyv';
import KeyvSqlite from '@keyv/sqlite';
import type { UserSession } from '../types.js';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/bot.sqlite';

// Initialize Keyv with SQLite
const store = new KeyvSqlite(`sqlite://${DATABASE_PATH}`);
const keyv = new Keyv({ store, namespace: 'sessions' });

// Encryption key derived from bot token (or use separate env var)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.TELEGRAM_BOT_TOKEN || 'default-dev-key';

/**
 * Get derived encryption key (32 bytes for AES-256)
 */
function getEncryptionKey(): Buffer {
  return createHash('sha256').update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypt sensitive data (API keys)
 */
function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Get user session by Telegram user ID
 */
export async function getSession(userId: number): Promise<UserSession> {
  const data = await keyv.get(String(userId));
  if (!data) {
    return {};
  }

  // Decrypt API key if present
  if (data.apiKey) {
    try {
      data.apiKey = decrypt(data.apiKey);
    } catch {
      // If decryption fails, key might be corrupted - clear it
      data.apiKey = undefined;
    }
  }

  return data as UserSession;
}

/**
 * Save user session
 */
export async function saveSession(userId: number, session: UserSession): Promise<void> {
  const dataToSave = { ...session };

  // Encrypt API key before saving
  if (dataToSave.apiKey) {
    dataToSave.apiKey = encrypt(dataToSave.apiKey);
  }

  await keyv.set(String(userId), dataToSave);
}

/**
 * Update specific fields in user session
 */
export async function updateSession(
  userId: number,
  updates: Partial<UserSession>
): Promise<UserSession> {
  const current = await getSession(userId);
  const updated = { ...current, ...updates };
  await saveSession(userId, updated);
  return updated;
}

/**
 * Set user's API key
 */
export async function setApiKey(userId: number, apiKey: string): Promise<void> {
  await updateSession(userId, {
    apiKey,
    linkedAt: new Date().toISOString(),
  });
}

/**
 * Get user's API key (decrypted)
 */
export async function getApiKey(userId: number): Promise<string | undefined> {
  const session = await getSession(userId);
  return session.apiKey;
}

/**
 * Set last used prompt
 */
export async function setLastPrompt(userId: number, prompt: string): Promise<void> {
  await updateSession(userId, { lastPrompt: prompt });
}

/**
 * Get last used prompt
 */
export async function getLastPrompt(userId: number): Promise<string | undefined> {
  const session = await getSession(userId);
  return session.lastPrompt;
}

/**
 * Clear user session
 */
export async function clearSession(userId: number): Promise<void> {
  await keyv.delete(String(userId));
}

/**
 * Check if user has API key configured
 */
export async function hasApiKey(userId: number): Promise<boolean> {
  const session = await getSession(userId);
  return !!session.apiKey;
}
