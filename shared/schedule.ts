// Calcul des prochaines dates d'envoi, en tenant compte du fuseau horaire (heure d'été comprise).
import type { Schedule } from './types';

export interface LocalParts {
  y: number;
  m: number; // 1-12
  d: number;
  h: number;
  mi: number;
  weekday: number; // 0 = dimanche
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

/** Date/heure locales d'un instant dans un fuseau. */
export function localParts(tz: string, t: number): LocalParts {
  const p: Record<string, number> = {};
  for (const part of fmt(tz).formatToParts(new Date(t))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return { y: p.year, m: p.month, d: p.day, h: p.hour, mi: p.minute, weekday };
}

function offsetAt(tz: string, t: number): number {
  const t0 = Math.floor(t / 60000) * 60000; // les décalages horaires sont des minutes entières
  const p = localParts(tz, t0);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - t0;
}

/** Instant correspondant à une date/heure locale dans un fuseau. */
export function zonedToEpoch(tz: string, y: number, m: number, d: number, h: number, mi: number): number {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetAt(tz, guess);
  // Deuxième passe pour les changements d'heure.
  t = guess - offsetAt(tz, t);
  return t;
}

export function parseHM(hm: string | undefined, fallback = '09:00'): [number, number] {
  const [h, mi] = (hm || fallback).split(':').map(Number);
  return [h || 0, mi || 0];
}

function addDays(y: number, m: number, d: number, k: number) {
  const dt = new Date(Date.UTC(y, m - 1, d + k));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), weekday: dt.getUTCDay() };
}

/** Prochain envoi strictement après « from », ou null s'il n'y en a plus. */
export function computeNext(s: Schedule, from: number, tz: string): number | null {
  if (s.kind === 'once') {
    if (!s.at) return null;
    const [date, time] = s.at.split('T');
    const [y, m, d] = date.split('-').map(Number);
    const [h, mi] = parseHM(time);
    const t = zonedToEpoch(tz, y, m, d, h, mi);
    return t > from ? t : null;
  }

  const days = s.days && s.days.length ? s.days : [0, 1, 2, 3, 4, 5, 6];
  const today = localParts(tz, from);

  for (let k = 0; k <= 8; k++) {
    const day = addDays(today.y, today.m, today.d, k);
    if (!days.includes(day.weekday)) continue;

    if (s.kind === 'daily') {
      const [h, mi] = parseHM(s.time);
      const t = zonedToEpoch(tz, day.y, day.m, day.d, h, mi);
      if (t > from) return t;
    } else if (s.kind === 'interval') {
      const every = Math.max(15, s.every || 120);
      const [sh, sm] = parseHM(s.start, '09:00');
      const [eh, em] = parseHM(s.end, '19:00');
      for (let min = sh * 60 + sm; min <= eh * 60 + em; min += every) {
        const t = zonedToEpoch(tz, day.y, day.m, day.d, Math.floor(min / 60), min % 60);
        if (t > from) return t;
      }
    }
  }
  return null;
}

/** true si l'heure locale de « t » tombe dans la plage calme (qui peut passer minuit). */
export function inQuietHours(t: number, tz: string, start: string, end: string): boolean {
  const p = localParts(tz, t);
  const now = p.h * 60 + p.mi;
  const [sh, sm] = parseHM(start);
  const [eh, em] = parseHM(end);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false;
  return s < e ? now >= s && now < e : now >= s || now < e;
}

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/** Description courte en français (« Lun → Ven · 9:30 »), partagée avec l'interface. */
export function describeSchedule(s: Schedule): string {
  const hm = (v?: string) => (v ? v.replace(/^0(\d)/, '$1') : '');
  const daysLabel = (days?: number[]) => {
    const d = days && days.length ? [...days].sort() : [0, 1, 2, 3, 4, 5, 6];
    if (d.length === 7) return 'Tous les jours';
    const key = d.join(',');
    if (key === '1,2,3,4,5') return 'Lun → Ven';
    if (key === '0,6') return 'Le week-end';
    // Lundi en premier
    return [...d].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((i) => DAY_NAMES[i]).join(', ');
  };
  if (s.kind === 'once') {
    if (!s.at) return 'Une fois';
    const [date, time] = s.at.split('T');
    const [, m, d] = date.split('-');
    return `Le ${Number(d)}/${Number(m)} · ${hm(time)}`;
  }
  if (s.kind === 'daily') return `${daysLabel(s.days)} · ${hm(s.time)}`;
  const every = s.every || 120;
  const freq = every % 60 === 0 ? `${every / 60} h` : `${every} min`;
  return `Toutes les ${freq} · ${hm(s.start)} → ${hm(s.end)}`;
}
