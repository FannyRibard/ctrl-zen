import { describe, expect, it } from 'vitest';
import { createECDH, createPublicKey, generateKeyPairSync, randomBytes, verify } from 'node:crypto';
// @ts-expect-error pas de types pour http_ece
import ece from 'http_ece';
import { b64urlDecode, b64urlEncode, encryptPayload, vapidAuthorization } from '../worker/push';

describe('chiffrement Web Push (aes128gcm)', () => {
  it('produit un message que la bibliothèque de référence sait déchiffrer', async () => {
    // Clés « navigateur »
    const ua = createECDH('prime256v1');
    ua.generateKeys();
    const auth = randomBytes(16);
    const p256dh = b64urlEncode(new Uint8Array(ua.getPublicKey()));

    const message = JSON.stringify({ title: '🌿 Pause respiration', body: '« Ce à quoi tu résistes persiste. »' });
    const encrypted = await encryptPayload(new TextEncoder().encode(message), p256dh, b64urlEncode(new Uint8Array(auth)));

    const decrypted = ece.decrypt(Buffer.from(encrypted), {
      version: 'aes128gcm',
      privateKey: ua,
      authSecret: auth,
    });
    expect(decrypted.toString('utf8')).toBe(message);
  });
});

describe('VAPID', () => {
  it('signe un JWT ES256 valide avec la bonne audience', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const jwk = privateKey.export({ format: 'jwk' });
    const pub = new Uint8Array([4, ...b64urlDecode(jwk.x!), ...b64urlDecode(jwk.y!)]);
    const vapid = { publicKey: b64urlEncode(pub), privateKey: jwk.d!, subject: 'https://ctrl-zen.example.workers.dev' };

    const header = await vapidAuthorization('https://web.push.apple.com/abc123', vapid);
    const m = header.match(/^vapid t=([^,]+), k=(.+)$/);
    expect(m).not.toBeNull();
    const [h, p, s] = m![1].split('.');
    const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(claims.aud).toBe('https://web.push.apple.com');
    expect(claims.sub).toBe(vapid.subject);
    expect(m![2]).toBe(vapid.publicKey);

    const ok = verify(
      'sha256',
      Buffer.from(`${h}.${p}`),
      { key: createPublicKey(publicKey.export({ format: 'pem', type: 'spki' })), dsaEncoding: 'ieee-p1363' },
      Buffer.from(s, 'base64url'),
    );
    expect(ok).toBe(true);
  });
});
