// Ctrl+Zen — Worker Cloudflare : API, envoi programmé et service des fichiers de l'app.
import type {
  AppState,
  Category,
  HistoryItem,
  Notif,
  NotifInput,
  PushPayload,
  Quote,
  QuoteType,
  Schedule,
  Settings,
  Template,
} from '../shared/types';
import { QUOTE_TYPES } from '../shared/types';
import { ICON_EMOJI, QUOTE_TYPE_EMOJI, QUOTE_TYPE_LABEL, composeBody, quoteBudget } from '../shared/meta';
import { computeNext, inQuietHours } from '../shared/schedule';
import { sendPush, type VapidKeys } from './push';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_SECRET: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT?: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

// ---------- Lecture / conversion des lignes ----------

type Row = Record<string, unknown>;

const parseTypes = (v: unknown): QuoteType[] =>
  String(v || '')
    .split(',')
    .filter((t): t is QuoteType => (QUOTE_TYPES as string[]).includes(t));

const toCategory = (r: Row): Category => ({
  id: Number(r.id),
  name: String(r.name),
  icon: (r.icon as string) ?? null,
  emoji: (r.emoji as string) ?? null,
  color: String(r.color),
});

const toNotif = (r: Row): Notif => ({
  id: Number(r.id),
  title: String(r.title),
  body: String(r.body ?? ''),
  categoryId: r.category_id == null ? null : Number(r.category_id),
  useQuote: !!r.use_quote,
  quoteTypes: parseTypes(r.quote_types),
  schedule: JSON.parse(String(r.schedule)) as Schedule,
  active: !!r.active,
  nextRun: r.next_run == null ? null : Number(r.next_run),
  lastRun: r.last_run == null ? null : Number(r.last_run),
  system: (r.system as string) ?? null,
});

const toTemplate = (r: Row): Template => ({
  id: Number(r.id),
  title: String(r.title),
  body: String(r.body ?? ''),
  categoryId: r.category_id == null ? null : Number(r.category_id),
  useQuote: !!r.use_quote,
  quoteTypes: parseTypes(r.quote_types),
});

const toQuote = (r: Row): Quote => ({
  id: Number(r.id),
  text: String(r.text),
  author: (r.author as string) ?? null,
  type: r.type as QuoteType,
  custom: !!r.custom,
  favorite: !!r.favorite,
});

async function getSettings(env: Env): Promise<Settings> {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  const m = Object.fromEntries(results.map((r) => [r.key, r.value]));
  return {
    timezone: m.timezone || 'Europe/Paris',
    quietEnabled: m.quietEnabled === '1',
    quietStart: m.quietStart || '22:00',
    quietEnd: m.quietEnd || '07:00',
  };
}

// ---------- Validation ----------

const HM = /^\d{2}:\d{2}$/;

function cleanSchedule(s: Schedule | undefined): Schedule {
  if (!s || !['once', 'daily', 'interval'].includes(s.kind)) throw new HttpError(400, 'Programmation invalide');
  const days = Array.isArray(s.days) ? [...new Set(s.days.map(Number).filter((d) => d >= 0 && d <= 6))] : undefined;
  if (s.kind === 'once') {
    if (!s.at || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.at)) throw new HttpError(400, 'Date invalide');
    return { kind: 'once', at: s.at };
  }
  if (s.kind === 'daily') {
    if (!s.time || !HM.test(s.time)) throw new HttpError(400, 'Heure invalide');
    return { kind: 'daily', days, time: s.time };
  }
  if (!s.start || !s.end || !HM.test(s.start) || !HM.test(s.end)) throw new HttpError(400, 'Plage horaire invalide');
  return { kind: 'interval', days, every: Math.max(15, Math.min(720, Number(s.every) || 120)), start: s.start, end: s.end };
}

function cleanInput(b: Partial<NotifInput>, needSchedule: boolean) {
  const title = String(b.title ?? '').trim().slice(0, 120);
  if (!title) throw new HttpError(400, 'Il faut un titre');
  return {
    title,
    body: String(b.body ?? '').trim().slice(0, 500),
    categoryId: b.categoryId == null ? null : Number(b.categoryId),
    useQuote: b.useQuote ? 1 : 0,
    quoteTypes: parseTypes((b.quoteTypes ?? []).join(',')).join(','),
    schedule: needSchedule ? cleanSchedule(b.schedule) : undefined,
  };
}

// ---------- Construction et envoi des messages ----------

/** Citation au hasard qui tient dans la place restante ; à défaut, la plus courte. */
async function randomQuote(env: Env, types: QuoteType[], maxLen = 999): Promise<Quote | null> {
  const list = types.length ? types : QUOTE_TYPES;
  const inTypes = `type IN (${list.map(() => '?').join(',')})`;
  const fits = await env.DB.prepare(
    `SELECT * FROM quotes WHERE ${inTypes} AND length(text) <= ? ORDER BY RANDOM() LIMIT 1`,
  )
    .bind(...list, maxLen)
    .first<Row>();
  if (fits) return toQuote(fits);
  const shortest = await env.DB.prepare(`SELECT * FROM quotes WHERE ${inTypes} ORDER BY length(text) LIMIT 1`)
    .bind(...list)
    .first<Row>();
  return shortest ? toQuote(shortest) : null;
}

async function categoryPrefix(env: Env, categoryId: number | null): Promise<string> {
  if (categoryId == null) return '';
  const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first<Row>();
  if (!row) return '';
  const c = toCategory(row);
  const e = c.emoji || (c.icon ? ICON_EMOJI[c.icon] : '');
  return e ? `${e} ` : '';
}

interface MessageSource {
  title: string;
  body: string;
  categoryId: number | null;
  useQuote: boolean;
  quoteTypes: QuoteType[];
  system?: string | null;
}

async function buildMessage(env: Env, src: MessageSource, tag?: string): Promise<PushPayload> {
  let title = src.title;
  let body = src.body;
  if (src.useQuote) {
    const q = await randomQuote(env, src.quoteTypes, quoteBudget(body));
    if (q) {
      body = composeBody(body, q);
      if (src.system === 'daily_quote') title = `${QUOTE_TYPE_EMOJI[q.type]} ${QUOTE_TYPE_LABEL[q.type]} du jour`;
    }
  }
  if (src.system !== 'daily_quote') title = (await categoryPrefix(env, src.categoryId)) + title;
  return { title, body: body || ' ', url: '/', tag };
}

function vapid(env: Env, origin?: string): VapidKeys {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) throw new HttpError(500, 'Clés VAPID manquantes');
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT || origin || 'mailto:ctrl-zen@example.com',
  };
}

/** Envoie un message à tous les appareils abonnés et l'inscrit dans l'historique. */
async function deliver(env: Env, msg: PushPayload, origin?: string): Promise<number> {
  const { results } = await env.DB.prepare('SELECT * FROM subscriptions').all<Row>();
  const keys = vapid(env, origin);
  let sent = 0;
  for (const s of results) {
    try {
      const r = await sendPush(
        { endpoint: String(s.endpoint), p256dh: String(s.p256dh), auth: String(s.auth) },
        msg,
        keys,
      );
      if (r.ok) sent++;
      else if (r.gone) await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(s.id).run();
      else console.warn('Push refusé', r.status);
    } catch (e) {
      console.error('Erreur push', e);
    }
  }
  await env.DB.prepare('INSERT INTO history (title, body, sent_at, sent) VALUES (?, ?, ?, ?)')
    .bind(msg.title, msg.body, Date.now(), sent)
    .run();
  await env.DB.prepare('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY sent_at DESC LIMIT 200)').run();
  return sent;
}

// ---------- Programmation ----------

async function refreshNextRun(env: Env, id: number, tz?: string) {
  const row = await env.DB.prepare('SELECT * FROM notifications WHERE id = ?').bind(id).first<Row>();
  if (!row) return;
  const n = toNotif(row);
  const zone = tz || (await getSettings(env)).timezone;
  const next = n.active ? computeNext(n.schedule, Date.now(), zone) : null;
  await env.DB.prepare('UPDATE notifications SET next_run = ? WHERE id = ?').bind(next, id).run();
}

async function refreshAll(env: Env) {
  const tz = (await getSettings(env)).timezone;
  const { results } = await env.DB.prepare('SELECT id FROM notifications').all<{ id: number }>();
  for (const r of results) await refreshNextRun(env, r.id, tz);
}

/** Appelé toutes les minutes par le cron. */
export async function runDue(env: Env, now = Date.now()) {
  const settings = await getSettings(env);
  const tz = settings.timezone;

  // Notifs actives sans prochaine date (ex. la citation du jour au premier lancement).
  const { results: pending } = await env.DB.prepare(
    'SELECT id FROM notifications WHERE active = 1 AND next_run IS NULL',
  ).all<{ id: number }>();
  for (const p of pending) await refreshNextRun(env, p.id, tz);

  const { results } = await env.DB.prepare(
    'SELECT * FROM notifications WHERE active = 1 AND next_run IS NOT NULL AND next_run <= ?',
  )
    .bind(now + 30_000)
    .all<Row>();

  for (const row of results) {
    const n = toNotif(row);
    const quiet =
      n.schedule.kind !== 'once' &&
      settings.quietEnabled &&
      inQuietHours(n.nextRun!, tz, settings.quietStart, settings.quietEnd);

    if (!quiet) {
      try {
        await deliver(env, await buildMessage(env, n, `notif-${n.id}`));
      } catch (e) {
        console.error('Envoi impossible', n.id, e);
      }
    }
    const next = computeNext(n.schedule, Math.max(now, n.nextRun!), tz);
    await env.DB.prepare('UPDATE notifications SET last_run = ?, next_run = ?, active = ? WHERE id = ?')
      .bind(quiet ? n.lastRun : now, next, next == null ? 0 : 1, n.id)
      .run();
  }
}

// ---------- API ----------

function checkAuth(req: Request, env: Env) {
  if (!env.APP_SECRET) throw new HttpError(500, 'APP_SECRET n’est pas configuré');
  const h = req.headers.get('Authorization') || '';
  const given = h.startsWith('Bearer ') ? h.slice(7) : req.headers.get('X-Ctrl-Zen-Key') || '';
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(env.APP_SECRET);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) throw new HttpError(401, 'Code d’accès incorrect');
}

async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

async function getState(env: Env): Promise<AppState> {
  const [cats, notifs, tpls, quotes, settings, devices] = await Promise.all([
    env.DB.prepare('SELECT * FROM categories ORDER BY id').all<Row>(),
    env.DB.prepare('SELECT * FROM notifications ORDER BY next_run IS NULL, next_run').all<Row>(),
    env.DB.prepare('SELECT * FROM templates ORDER BY id').all<Row>(),
    env.DB.prepare('SELECT * FROM quotes ORDER BY custom DESC, id DESC').all<Row>(),
    getSettings(env),
    env.DB.prepare('SELECT COUNT(*) AS n FROM subscriptions').first<{ n: number }>(),
  ]);
  return {
    categories: cats.results.map(toCategory),
    notifications: notifs.results.map(toNotif),
    templates: tpls.results.map(toTemplate),
    quotes: quotes.results.map(toQuote),
    settings,
    vapidPublicKey: env.VAPID_PUBLIC_KEY || '',
    devices: devices?.n ?? 0,
  };
}

async function handleApi(req: Request, env: Env, url: URL): Promise<Response> {
  checkAuth(req, env);
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [res, idStr, action] = parts;
  const id = idStr ? Number(idStr) : NaN;
  const m = req.method;
  const db = env.DB;
  const now = Date.now();

  switch (res) {
    case 'state':
      return json(await getState(env));

    case 'subscribe': {
      const b = await readJson<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>(req);
      if (!b.endpoint || !b.keys?.p256dh || !b.keys?.auth) throw new HttpError(400, 'Abonnement invalide');
      await db
        .prepare(
          `INSERT INTO subscriptions (endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
        )
        .bind(b.endpoint, b.keys.p256dh, b.keys.auth, now)
        .run();
      return json({ ok: true });
    }

    case 'unsubscribe': {
      const b = await readJson<{ endpoint?: string }>(req);
      if (b.endpoint) await db.prepare('DELETE FROM subscriptions WHERE endpoint = ?').bind(b.endpoint).run();
      return json({ ok: true });
    }

    case 'test': {
      const sent = await deliver(
        env,
        { title: '🌿 Ctrl+Zen', body: 'Les notifications marchent. Respire, tout va bien.', url: '/' },
        url.origin,
      );
      return json({ sent });
    }

    case 'send': {
      // Envoi immédiat : depuis l'app, ou depuis Raccourcis iOS / un script.
      const b = await readJson<Partial<NotifInput> & { quote?: string; templateId?: number }>(req);
      let src: MessageSource;
      if (b.templateId) {
        const row = await db.prepare('SELECT * FROM templates WHERE id = ?').bind(b.templateId).first<Row>();
        if (!row) throw new HttpError(404, 'Modèle introuvable');
        src = toTemplate(row);
      } else {
        const quoteTypes = b.quote ? (b.quote === 'any' ? [] : parseTypes(b.quote)) : b.quoteTypes || [];
        const useQuote = !!b.quote || !!b.useQuote;
        const title = String(b.title ?? '').trim() || (useQuote ? 'Une pensée pour toi' : '');
        if (!title) throw new HttpError(400, 'Il faut un titre');
        src = {
          title: title.slice(0, 120),
          body: String(b.body ?? '').slice(0, 500),
          categoryId: b.categoryId ?? null,
          useQuote,
          quoteTypes,
        };
      }
      const sent = await deliver(env, await buildMessage(env, src), url.origin);
      return json({ sent });
    }

    case 'notifications': {
      if (m === 'POST' && !idStr) {
        const v = cleanInput(await readJson<NotifInput>(req), true);
        const r = await db
          .prepare(
            `INSERT INTO notifications (title, body, category_id, use_quote, quote_types, schedule, active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?) RETURNING id`,
          )
          .bind(v.title, v.body, v.categoryId, v.useQuote, v.quoteTypes, JSON.stringify(v.schedule), now)
          .first<{ id: number }>();
        await refreshNextRun(env, r!.id);
        return json({ id: r!.id });
      }
      if (!Number.isFinite(id)) break;
      if (m === 'PUT') {
        const existing = await db.prepare('SELECT system FROM notifications WHERE id = ?').bind(id).first<Row>();
        if (!existing) throw new HttpError(404, 'Notif introuvable');
        const v = cleanInput(await readJson<NotifInput>(req), true);
        await db
          .prepare(
            `UPDATE notifications SET title = ?, body = ?, category_id = ?, use_quote = ?, quote_types = ?, schedule = ?, active = 1
             WHERE id = ?`,
          )
          .bind(v.title, v.body, v.categoryId, v.useQuote, v.quoteTypes, JSON.stringify(v.schedule), id)
          .run();
        await refreshNextRun(env, id);
        return json({ ok: true });
      }
      if (m === 'PATCH') {
        const b = await readJson<{ active?: boolean; quoteTypes?: QuoteType[]; time?: string }>(req);
        if (b.active !== undefined) await db.prepare('UPDATE notifications SET active = ? WHERE id = ?').bind(b.active ? 1 : 0, id).run();
        if (b.quoteTypes) await db.prepare('UPDATE notifications SET quote_types = ? WHERE id = ?').bind(parseTypes(b.quoteTypes.join(',')).join(','), id).run();
        if (b.time && HM.test(b.time)) {
          const row = await db.prepare('SELECT schedule FROM notifications WHERE id = ?').bind(id).first<{ schedule: string }>();
          if (row) {
            const s = JSON.parse(row.schedule) as Schedule;
            if (s.kind === 'daily') {
              s.time = b.time;
              await db.prepare('UPDATE notifications SET schedule = ? WHERE id = ?').bind(JSON.stringify(s), id).run();
            }
          }
        }
        await refreshNextRun(env, id);
        return json({ ok: true });
      }
      if (m === 'DELETE') {
        await db.prepare('DELETE FROM notifications WHERE id = ? AND system IS NULL').bind(id).run();
        return json({ ok: true });
      }
      break;
    }

    case 'templates': {
      if (m === 'POST' && !idStr) {
        const v = cleanInput(await readJson<NotifInput>(req), false);
        const r = await db
          .prepare(
            'INSERT INTO templates (title, body, category_id, use_quote, quote_types, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
          )
          .bind(v.title, v.body, v.categoryId, v.useQuote, v.quoteTypes, now)
          .first<{ id: number }>();
        return json({ id: r!.id });
      }
      if (!Number.isFinite(id)) break;
      if (m === 'POST' && action === 'send') {
        const row = await db.prepare('SELECT * FROM templates WHERE id = ?').bind(id).first<Row>();
        if (!row) throw new HttpError(404, 'Modèle introuvable');
        const sent = await deliver(env, await buildMessage(env, toTemplate(row)), url.origin);
        return json({ sent });
      }
      if (m === 'PUT') {
        const v = cleanInput(await readJson<NotifInput>(req), false);
        await db
          .prepare('UPDATE templates SET title = ?, body = ?, category_id = ?, use_quote = ?, quote_types = ? WHERE id = ?')
          .bind(v.title, v.body, v.categoryId, v.useQuote, v.quoteTypes, id)
          .run();
        return json({ ok: true });
      }
      if (m === 'DELETE') {
        await db.prepare('DELETE FROM templates WHERE id = ?').bind(id).run();
        return json({ ok: true });
      }
      break;
    }

    case 'categories': {
      const read = async () => {
        const b = await readJson<Partial<Category>>(req);
        const name = String(b.name ?? '').trim().slice(0, 40);
        if (!name) throw new HttpError(400, 'Il faut un nom');
        return { name, icon: b.icon || null, emoji: b.emoji || null, color: String(b.color || 'sauge') };
      };
      if (m === 'POST' && !idStr) {
        const v = await read();
        const r = await db
          .prepare('INSERT INTO categories (name, icon, emoji, color) VALUES (?, ?, ?, ?) RETURNING id')
          .bind(v.name, v.icon, v.emoji, v.color)
          .first<{ id: number }>();
        return json({ id: r!.id });
      }
      if (!Number.isFinite(id)) break;
      if (m === 'PUT') {
        const v = await read();
        await db.prepare('UPDATE categories SET name = ?, icon = ?, emoji = ?, color = ? WHERE id = ?').bind(v.name, v.icon, v.emoji, v.color, id).run();
        return json({ ok: true });
      }
      if (m === 'DELETE') {
        await db.batch([
          db.prepare('UPDATE notifications SET category_id = NULL WHERE category_id = ?').bind(id),
          db.prepare('UPDATE templates SET category_id = NULL WHERE category_id = ?').bind(id),
          db.prepare('DELETE FROM categories WHERE id = ?').bind(id),
        ]);
        return json({ ok: true });
      }
      break;
    }

    case 'quotes': {
      if (m === 'POST' && !idStr) {
        const b = await readJson<Partial<Quote>>(req);
        const text = String(b.text ?? '').trim().replace(/^«\s*|\s*»$/g, '').slice(0, 400);
        const type = parseTypes(b.type)[0];
        if (!text || !type) throw new HttpError(400, 'Il faut un texte et un type');
        const author = String(b.author ?? '').trim().slice(0, 80) || null;
        const r = await db
          .prepare('INSERT INTO quotes (text, author, type, custom) VALUES (?, ?, ?, 1) RETURNING id')
          .bind(text, author, type)
          .first<{ id: number }>();
        return json({ id: r!.id });
      }
      if (!Number.isFinite(id)) break;
      if (m === 'PATCH') {
        const b = await readJson<{ favorite?: boolean }>(req);
        await db.prepare('UPDATE quotes SET favorite = ? WHERE id = ?').bind(b.favorite ? 1 : 0, id).run();
        return json({ ok: true });
      }
      if (m === 'DELETE') {
        await db.prepare('DELETE FROM quotes WHERE id = ?').bind(id).run();
        return json({ ok: true });
      }
      break;
    }

    case 'settings': {
      if (m !== 'PUT') break;
      const b = await readJson<Partial<Settings>>(req);
      const updates: [string, string][] = [];
      if (b.timezone) {
        try {
          new Intl.DateTimeFormat('fr', { timeZone: b.timezone });
          updates.push(['timezone', b.timezone]);
        } catch {
          throw new HttpError(400, 'Fuseau horaire inconnu');
        }
      }
      if (b.quietEnabled !== undefined) updates.push(['quietEnabled', b.quietEnabled ? '1' : '0']);
      if (b.quietStart && HM.test(b.quietStart)) updates.push(['quietStart', b.quietStart]);
      if (b.quietEnd && HM.test(b.quietEnd)) updates.push(['quietEnd', b.quietEnd]);
      if (updates.length) {
        await db.batch(
          updates.map(([k, v]) =>
            db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, v),
          ),
        );
      }
      if (b.timezone) await refreshAll(env);
      return json({ ok: true });
    }

    case 'tick': {
      // Lance tout de suite la vérification normalement faite chaque minute par le cron.
      if (m !== 'POST') break;
      await runDue(env);
      return json({ ok: true });
    }

    case 'history': {
      const { results } = await db.prepare('SELECT * FROM history ORDER BY sent_at DESC LIMIT 50').all<Row>();
      const items: HistoryItem[] = results.map((r) => ({
        id: Number(r.id),
        title: String(r.title),
        body: String(r.body),
        sentAt: Number(r.sent_at),
        sent: Number(r.sent),
      }));
      return json(items);
    }
  }
  throw new HttpError(404, 'Route inconnue');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(req, env, url);
      } catch (e) {
        if (e instanceof HttpError) return json({ error: e.message }, e.status);
        console.error(e);
        return json({ error: 'Erreur interne' }, 500);
      }
    }
    return env.ASSETS.fetch(req);
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDue(env));
  },
} satisfies ExportedHandler<Env>;
