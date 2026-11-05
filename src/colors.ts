import type { QuoteType } from '../shared/types';

/** Couleurs pastel des catégories : fond doux + couleur d'encre lisible dessus. */
export const COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  sauge: { bg: '#DCE8D5', fg: '#3F6B4A', label: 'Sauge' },
  menthe: { bg: '#C9E6D7', fg: '#24603F', label: 'Menthe' },
  ciel: { bg: '#DCE6F2', fg: '#2F527A', label: 'Ciel' },
  lavande: { bg: '#E6E0F2', fg: '#4E3F7A', label: 'Lavande' },
  rose: { bg: '#F6DCDC', fg: '#8E3F3F', label: 'Rose' },
  abricot: { bg: '#F9E3CC', fg: '#7A4E20', label: 'Abricot' },
  beurre: { bg: '#F6EDC4', fg: '#6B5A12', label: 'Beurre' },
  sable: { bg: '#E9E1D3', fg: '#5E5140', label: 'Sable' },
};

export const color = (name: string | undefined) => COLORS[name || 'sauge'] ?? COLORS.sauge;

export const QUOTE_STYLE: Record<QuoteType, { bg: string; fg: string; icon: string }> = {
  motivation: { bg: '#F9E3CC', fg: '#6B4318', icon: 'flame' },
  psychologie: { bg: '#E6E0F2', fg: '#4E3F7A', icon: 'smile' },
  philosophie: { bg: '#DCE6F2', fg: '#2F527A', icon: 'book' },
};
