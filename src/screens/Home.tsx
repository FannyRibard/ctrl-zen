import { useMemo, useState } from 'preact/hooks';
import type { Notif } from '../../shared/types';
import { QUOTE_TYPES } from '../../shared/types';
import { QUOTE_TYPE_LABEL } from '../../shared/meta';
import { describeSchedule } from '../../shared/schedule';
import { Icon } from '../icons';
import { QUOTE_STYLE, color } from '../colors';
import { CatBadge, Nav, useApp } from '../ui';
import { greeting, hm, isToday, relativeDay, todayLabel } from '../format';
import { getName } from '../prefs';
import { PushBanner } from './PushBanner';

export function Home() {
  const { state, go } = useApp();
  const name = getName();

  // Citation du jour : la même toute la journée, « mélanger » pour en voir une autre.
  const [shift, setShift] = useState(0);
  const quote = useMemo(() => {
    if (!state.quotes.length) return null;
    const d = new Date();
    const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
    // Le type change à chaque « mélanger » (Motivation → Psychologie → Philosophie…) et d'un jour à l'autre.
    const types = QUOTE_TYPES.filter((t) => state.quotes.some((q) => q.type === t));
    const type = types[(day + shift) % types.length];
    const pool = state.quotes.filter((q) => q.type === type);
    // Mélange stable : même citation toute la journée, une autre à chaque tour.
    const n = Math.floor((day * 2654435761 + shift * 40503) % 4294967296);
    return pool[n % pool.length];
  }, [state.quotes, shift]);

  const upcoming = state.notifications.filter((n) => n.active && n.nextRun);
  const today = upcoming.filter((n) => isToday(n.nextRun!));
  const later = upcoming.filter((n) => !isToday(n.nextRun!)).slice(0, 4);
  const catOf = (n: Notif) => state.categories.find((c) => c.id === n.categoryId);

  const row = (n: Notif, time: string) => {
    const cat = catOf(n);
    const daily = n.system === 'daily_quote';
    return (
      <div class="tl-row" key={n.id}>
        <div class="tl-time">{time}</div>
        <button type="button" class="notif-card" onClick={() => go(daily ? { name: 'settings' } : { name: 'editor', mode: 'notif', id: n.id })}>
          {daily ? (
            <span class="cat-badge" style={{ background: '#F9E3CC' }}>
              <Icon name="quote" size={20} color="#7A4E20" />
            </span>
          ) : (
            <CatBadge cat={cat} />
          )}
          <div class="grow stack" style={{ gap: '1px' }}>
            <span class="notif-title">{n.title}</span>
            <span class="notif-sub">
              {daily ? 'Tous les jours' : describeSchedule(n.schedule)}
              {n.useQuote ? ' · + citation' : ''}
            </span>
          </div>
        </button>
      </div>
    );
  };

  return (
    <main class="screen">
      <div class="stack" style={{ gap: '4px' }}>
        <span class="sub">{todayLabel()}</span>
        <h1 class="h1">
          {greeting()}
          {name ? `, ${name}` : ''}.
        </h1>
      </div>

      <PushBanner />

      {quote && (
        <section class="quote-card" aria-label="Citation du jour">
          <div class="between">
            <span class="tag" style={{ background: 'rgba(255,255,255,0.7)', color: QUOTE_STYLE[quote.type].fg }}>
              <Icon name={QUOTE_STYLE[quote.type].icon} size={14} color={QUOTE_STYLE[quote.type].fg} />
              {QUOTE_TYPE_LABEL[quote.type]}
            </span>
            <button type="button" class="icon-btn light" aria-label="Une autre citation" onClick={() => setShift((s) => s + 1)}>
              <Icon name="shuffle" size={18} />
            </button>
          </div>
          <p>« {quote.text} »</p>
          {quote.author && <span style={{ fontSize: '14px', fontWeight: 500, color: '#3F5A45' }}>{quote.author}</span>}
        </section>
      )}

      <section class="stack" style={{ gap: '12px' }}>
        <div class="between">
          <h2 class="h2">Aujourd’hui</h2>
          <button type="button" class="link-btn" style={{ fontSize: '14px', fontWeight: 600 }} onClick={() => go({ name: 'reminders' })}>
            Tous mes rappels
          </button>
        </div>
        {today.length ? (
          <div class="timeline">{today.map((n) => row(n, hm(n.nextRun!)))}</div>
        ) : (
          <div class="card empty">
            Plus rien de prévu aujourd’hui.
            <br />
            Profite, tu as le droit de ne rien faire 🌿
          </div>
        )}
      </section>

      {later.length > 0 && (
        <section class="stack" style={{ gap: '12px' }}>
          <h2 class="h2">Ensuite</h2>
          <div class="timeline">
            {later.map((n) => row(n, relativeDay(n.nextRun!) === 'Demain' ? 'Dem.' : relativeDay(n.nextRun!).split(' ')[0]))}
          </div>
        </section>
      )}

      {!upcoming.length && (
        <button type="button" class="btn" onClick={() => go({ name: 'editor', mode: 'notif' })}>
          <Icon name="plus" size={20} color="#fff" /> Créer mon premier rappel
        </button>
      )}

      <Nav current="home" />
    </main>
  );
}

export function categoryColor(id: number | null, cats: { id: number; color: string }[]) {
  return color(cats.find((c) => c.id === id)?.color);
}
