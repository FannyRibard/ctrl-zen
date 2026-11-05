// Libellés et correspondances partagés par l'interface et le Worker.
import type { QuoteType } from './types';

/**
 * Nombre de caractères que l'iPhone affiche à peu près sans « … » dans une notif repliée (4 lignes).
 * Au-delà, il faut appuyer longuement sur la notif pour tout lire.
 */
export const NOTIF_BODY_BUDGET = 150;

/**
 * Mise en forme compacte : le message, puis « citation », sans ligne vide.
 * L'auteur n'apparaît pas dans la notif (il reste visible dans l'app).
 */
export function composeBody(body: string, quote?: { text: string } | null): string {
  const b = body.trim();
  if (!quote) return b;
  const q = `« ${quote.text} »`;
  return b ? `${b}\n${q}` : q;
}

/** Place laissée au texte de la citation une fois le message écrit. */
export function quoteBudget(body: string): number {
  const b = body.trim();
  return NOTIF_BODY_BUDGET - (b ? b.length + 1 : 0) - 4; // 4 = « » et espaces
}

export const QUOTE_TYPE_LABEL: Record<QuoteType, string> = {
  motivation: 'Motivation',
  psychologie: 'Psychologie',
  philosophie: 'Philosophie',
};

export const QUOTE_TYPE_EMOJI: Record<QuoteType, string> = {
  motivation: '🔥',
  psychologie: '🧠',
  philosophie: '📖',
};

/** Emoji affiché dans le titre de la notif iPhone quand la catégorie utilise une icône. */
export const ICON_EMOJI: Record<string, string> = {
  briefcase: '💼',
  heart: '❤️',
  droplet: '💧',
  sun: '☀️',
  moon: '🌙',
  home: '🏠',
  book: '📖',
  activity: '🏃',
  coffee: '☕',
  leaf: '🌿',
  music: '🎵',
  bag: '🛍️',
  pill: '💊',
  phone: '📞',
  calendar: '📅',
  flame: '🔥',
  smile: '🙂',
  plane: '✈️',
  gift: '🎁',
  star: '✨',
  wind: '🌬️',
  brain: '🧠',
  bed: '🛏️',
  paw: '🐾',
};
