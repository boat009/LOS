import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCODING = 'hex';

function getKey(): Buffer {
  const key = process.env.AES_ENCRYPTION_KEY || 'los-default-aes256-key-32bytes!!';
  return Buffer.from(key.padEnd(32).slice(0, 32));
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  const parts = ciphertext.split(':');
  const iv = Buffer.from(parts[0], ENCODING);
  const authTag = Buffer.from(parts[1], ENCODING);
  const encrypted = Buffer.from(parts[2], ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export function hash(value: string): string {
  if (!value) return '';
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

export function maskNationalId(nationalId: string): string {
  if (!nationalId || nationalId.length < 13) return nationalId;
  return `${nationalId[0]}-XXXX-XXXXX-XX-${nationalId[12]}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 9) return phone;
  const digits = phone.replace(/\D/g, '');
  return `0XX-XXX-${digits.slice(-4)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const masked = local.length > 2
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : `${local[0]}*`;
  return `${masked}@${domain}`;
}

export function generateHmac(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = generateHmac(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
