import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from '../lib/crypto.js';

describe('crypto', () => {
  it('encrypts and decrypts secrets', () => {
    const plain = 'hermes_dev_password';
    const encrypted = encryptSecret(plain, 'test-key');
    expect(encrypted).not.toContain(plain);
    expect(decryptSecret(encrypted, 'test-key')).toBe(plain);
  });
});
