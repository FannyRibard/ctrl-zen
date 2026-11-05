// Génère les clés VAPID (pour signer les notifications) et un code d'accès.
// Usage : node scripts/gen-vapid.mjs [--dev]   (--dev écrit aussi le fichier .dev.vars pour le mode local)
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = privateKey.export({ format: 'jwk' });
const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);

const vars = {
  VAPID_PUBLIC_KEY: pub.toString('base64url'),
  VAPID_PRIVATE_KEY: jwk.d,
  APP_SECRET: randomBytes(18).toString('base64url'),
};

if (process.argv.includes('--dev')) {
  if (existsSync('.dev.vars')) {
    console.log('.dev.vars existe déjà, je n’y touche pas.');
  } else {
    writeFileSync('.dev.vars', Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
    console.log('Fichier .dev.vars créé pour le mode local.');
  }
} else {
  console.log('Voici tes clés. Garde-les précieusement (ne les partage pas) :\n');
  for (const [k, v] of Object.entries(vars)) console.log(`${k}=${v}`);
  console.log('\nÀ enregistrer sur Cloudflare avec :  npx wrangler secret put <NOM>');
}
