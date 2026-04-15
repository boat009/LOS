import { randomBytes } from 'crypto';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateId(length = 8): string {
  let result = '';
  const bytes = randomBytes(length * 2); // extra bytes for uniform distribution
  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

export function generateApplicationNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `LOS-${year}${month}${day}-${generateId()}`;
}

export function validateNationalId(id: string): boolean {
  if (!id || id.length !== 13 || !/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id[12]);
}
