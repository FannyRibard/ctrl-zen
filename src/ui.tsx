// Petits composants réutilisables.
import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect } from 'preact/hooks';
import type { AppState, Category } from '../shared/types';
import { ICON_EMOJI } from '../shared/meta';
import { Icon } from './icons';
import { color } from './colors';

export type Route =
  | { name: 'home' }
  | { name: 'reminders' }
  | { name: 'editor'; mode: 'notif' | 'template'; id?: number; templateId?: number }
  | { name: 'category'; id?: number }
  | { name: 'categories' }
  | { name: 'quotes' }
  | { name: 'templates' }
  | { name: 'settings' }
  | { name: 'history' }
  | { name: 'guide' };

export interface Ctx {
  state: AppState;
  reload: () => Promise<void>;
  go: (r: Route) => void;
  back: () => void;
  toast: (msg: string) => void;
  /** Exécute une action en affichant l'erreur éventuelle ; renvoie true si OK. */
  run: (fn: () => Promise<unknown>, okMsg?: string) => Promise<boolean>;
  pushOn: boolean;
  refreshPush: () => Promise<void>;
}

export const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} class="switch" onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export function Sheet({ children, onClose }: { children: ComponentChildren; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function catEmoji(c: Category | undefined | null) {
  if (!c) return '';
  return c.emoji || (c.icon ? ICON_EMOJI[c.icon] ?? '' : '');
}

/** Pastille carrée ou ronde avec l'icône ou l'emoji de la catégorie. */
export function CatBadge({ cat, size = 40, round = false }: { cat?: Category | null; size?: number; round?: boolean }) {
  const c = color(cat?.color);
  return (
    <span
      class="cat-badge"
      style={{ width: `${size}px`, height: `${size}px`, background: c.bg, borderRadius: round ? '50%' : `${Math.round(size * 0.3)}px`, fontSize: `${Math.round(size * 0.5)}px` }}
    >
      {cat?.emoji ? cat.emoji : <Icon name={cat?.icon || 'bell'} size={Math.round(size * 0.5)} color={c.fg} />}
    </span>
  );
}

export function TopBar({ left, title, right }: { left?: ComponentChildren; title: string; right?: ComponentChildren }) {
  return (
    <div class="top-bar">
      <div style={{ minWidth: '70px' }}>{left}</div>
      <span class="title">{title}</span>
      <div style={{ minWidth: '70px', display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

const TABS: { route: Route['name']; icon: string; label: string }[] = [
  { route: 'home', icon: 'home', label: 'Accueil' },
  { route: 'templates', icon: 'layers', label: 'Modèles' },
  { route: 'quotes', icon: 'quote', label: 'Citations' },
  { route: 'settings', icon: 'sliders', label: 'Réglages' },
];

export function Nav({ current }: { current: Route['name'] }) {
  const { go } = useApp();
  return (
    <nav class="nav" aria-label="Navigation">
      <div class="nav-pill">
        {TABS.map((t) => (
          <button
            type="button"
            class="nav-item"
            aria-current={current === t.route ? 'page' : undefined}
            onClick={() => go({ name: t.route } as Route)}
          >
            <Icon name={t.icon} size={22} stroke={current === t.route ? 2.2 : 2} />
            {t.label}
          </button>
        ))}
      </div>
      <button type="button" class="fab" aria-label="Nouvelle notification" onClick={() => go({ name: 'editor', mode: 'notif' })}>
        <Icon name="plus" size={26} stroke={2.6} />
      </button>
    </nav>
  );
}

export function NotifPreview({ title, body }: { title: string; body: string }) {
  return (
    <div class="preview" aria-label="Aperçu de la notification">
      <div class="app-icon">
        <img src="/icons/icon-192.png" alt="" />
      </div>
      <div class="grow stack" style={{ gap: '1px' }}>
        <div class="between">
          <span class="t">{title || 'Titre de ta notif'}</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>aperçu</span>
        </div>
        <span class="b">{body}</span>
      </div>
    </div>
  );
}
