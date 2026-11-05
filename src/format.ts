// Dates et heures en français.
export const hm = (t: number) => new Date(t).toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit' }).replace(/^0/, '');

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function isToday(t: number) {
  return dayKey(new Date(t)) === dayKey(new Date());
}

export function relativeDay(t: number): string {
  const d = new Date(t);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (dayKey(d) === dayKey(today)) return 'Aujourd’hui';
  if (dayKey(d) === dayKey(tomorrow)) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function todayLabel() {
  const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Douce nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Belle journée';
  return 'Bonne soirée';
}

/** Valeur pour <input type="datetime-local"> dans une heure. */
export function inOneHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}
