// Types partagés entre l'interface et le Worker.

export type QuoteType = 'motivation' | 'psychologie' | 'philosophie';
export const QUOTE_TYPES: QuoteType[] = ['motivation', 'psychologie', 'philosophie'];

export type ScheduleKind = 'once' | 'daily' | 'interval';

export interface Category {
  id: number;
  name: string;
  icon: string | null; // nom d'une icône de la bibliothèque (voir src/icons.tsx)
  emoji: string | null; // ou un emoji
  color: string; // nom de couleur pastel (voir src/colors.ts)
}

export interface Schedule {
  kind: ScheduleKind;
  /** once : date et heure locales « 2026-11-05T15:30 » */
  at?: string;
  /** daily / interval : jours de la semaine (0 = dimanche … 6 = samedi) */
  days?: number[];
  /** daily : heure locale « HH:MM » */
  time?: string;
  /** interval : toutes les N minutes, entre start et end (« HH:MM ») */
  every?: number;
  start?: string;
  end?: string;
}

export interface Notif {
  id: number;
  title: string;
  body: string;
  categoryId: number | null;
  useQuote: boolean;
  quoteTypes: QuoteType[];
  schedule: Schedule;
  active: boolean;
  nextRun: number | null; // epoch ms
  lastRun: number | null;
  system: string | null; // « daily_quote » pour la citation du jour
}

export interface Template {
  id: number;
  title: string;
  body: string;
  categoryId: number | null;
  useQuote: boolean;
  quoteTypes: QuoteType[];
}

export interface Quote {
  id: number;
  text: string;
  author: string | null;
  type: QuoteType;
  custom: boolean;
  favorite: boolean;
}

export interface HistoryItem {
  id: number;
  title: string;
  body: string;
  sentAt: number;
  sent: number; // nombre d'appareils atteints
}

export interface Settings {
  timezone: string;
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

export interface AppState {
  categories: Category[];
  notifications: Notif[];
  templates: Template[];
  quotes: Quote[];
  settings: Settings;
  vapidPublicKey: string;
  devices: number;
}

/** Ce qu'on envoie pour créer/éditer une notif ou un modèle. */
export interface NotifInput {
  title: string;
  body: string;
  categoryId: number | null;
  useQuote: boolean;
  quoteTypes: QuoteType[];
  schedule: Schedule;
}

/** Contenu du message push reçu par le service worker. */
export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}
