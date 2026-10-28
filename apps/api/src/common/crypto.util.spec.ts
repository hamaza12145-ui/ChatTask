import { CryptoUtil } from './crypto.util';

describe('CryptoUtil', () => {
  const secretKey = 'test-secret-key-for-unit-testing!';
  const plainText = 'postgresSuperSecretPassword123#$';

  it('should encrypt and decrypt string accurately', () => {
    const encrypted = CryptoUtil.encrypt(plainText, secretKey);
    expect(encrypted).not.toEqual(plainText);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = CryptoUtil.decrypt(encrypted, secretKey);
    expect(decrypted).toEqual(plainText);
  });

  it('should produce different ciphertext for different encryptions (IV randomization)', () => {
    const enc1 = CryptoUtil.encrypt(plainText, secretKey);
    const enc2 = CryptoUtil.encrypt(plainText, secretKey);
    expect(enc1).not.toEqual(enc2);
  });

  it('should return plain text as-is if ciphertext is not in IV:Tag:Data format', () => {
    const raw = 'already_plaintext_string';
    const res = CryptoUtil.decrypt(raw, secretKey);
    expect(res).toBe(raw);
  });
});
