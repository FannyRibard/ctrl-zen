import { describe, expect, it } from 'vitest';
import { computeNext, describeSchedule, inQuietHours, localParts, zonedToEpoch } from '../shared/schedule';

const TZ = 'Europe/Paris';
const at = (iso: string) => new Date(iso).getTime();

describe('fuseau horaire', () => {
  it('convertit une heure locale de Paris (hiver et été)', () => {
    expect(zonedToEpoch(TZ, 2026, 1, 15, 9, 30)).toBe(at('2026-01-15T08:30:00Z'));
    expect(zonedToEpoch(TZ, 2026, 7, 15, 9, 30)).toBe(at('2026-07-15T07:30:00Z'));
  });
  it('lit le jour de la semaine local', () => {
    expect(localParts(TZ, at('2026-11-05T10:00:00Z')).weekday).toBe(4); // jeudi
  });
});

describe('computeNext', () => {
  it('une fois : renvoie la date si elle est future, sinon rien', () => {
    const s = { kind: 'once' as const, at: '2026-11-05T15:30' };
    expect(computeNext(s, at('2026-11-05T10:00:00Z'), TZ)).toBe(at('2026-11-05T14:30:00Z'));
    expect(computeNext(s, at('2026-11-05T14:30:00Z'), TZ)).toBeNull();
  });

  it('tous les jours à 8:00 : demain si 8:00 est passé', () => {
    const s = { kind: 'daily' as const, time: '08:00', days: [0, 1, 2, 3, 4, 5, 6] };
    expect(computeNext(s, at('2026-11-05T06:00:00Z'), TZ)).toBe(at('2026-11-05T07:00:00Z'));
    expect(computeNext(s, at('2026-11-05T07:00:00Z'), TZ)).toBe(at('2026-11-06T07:00:00Z'));
  });

  it('du lundi au vendredi : saute le week-end', () => {
    const s = { kind: 'daily' as const, time: '09:30', days: [1, 2, 3, 4, 5] };
    // vendredi 6 nov. 2026 après 9:30 → lundi 9 nov.
    expect(computeNext(s, at('2026-11-06T12:00:00Z'), TZ)).toBe(at('2026-11-09T08:30:00Z'));
  });

  it('toutes les 2 h entre 9h et 19h', () => {
    const s = { kind: 'interval' as const, every: 120, start: '09:00', end: '19:00' };
    expect(computeNext(s, at('2026-11-05T09:10:00Z'), TZ)).toBe(at('2026-11-05T10:00:00Z')); // 11:00 Paris
    expect(computeNext(s, at('2026-11-05T18:00:00Z'), TZ)).toBe(at('2026-11-06T08:00:00Z')); // lendemain 9:00
  });

  it('passe correctement le changement d’heure', () => {
    const s = { kind: 'daily' as const, time: '08:00' };
    // nuit du 28 au 29 mars 2026 : passage à l'heure d'été
    expect(computeNext(s, at('2026-03-28T08:00:00Z'), TZ)).toBe(at('2026-03-29T06:00:00Z'));
  });
});

describe('mode calme', () => {
  it('gère une plage qui passe minuit', () => {
    expect(inQuietHours(at('2026-11-05T22:30:00Z'), TZ, '22:00', '07:00')).toBe(true); // 23:30
    expect(inQuietHours(at('2026-11-05T05:30:00Z'), TZ, '22:00', '07:00')).toBe(true); // 6:30
    expect(inQuietHours(at('2026-11-05T09:00:00Z'), TZ, '22:00', '07:00')).toBe(false); // 10:00
  });
});

describe('describeSchedule', () => {
  it('écrit des libellés lisibles', () => {
    expect(describeSchedule({ kind: 'daily', time: '09:30', days: [1, 2, 3, 4, 5] })).toBe('Lun → Ven · 9:30');
    expect(describeSchedule({ kind: 'interval', every: 120, start: '09:00', end: '19:00' })).toBe('Toutes les 2 h · 9:00 → 19:00');
  });
});
