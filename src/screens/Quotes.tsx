import { useState } from 'preact/hooks';
import type { QuoteType } from '../../shared/types';
import { QUOTE_TYPES } from '../../shared/types';
import { QUOTE_TYPE_LABEL } from '../../shared/meta';
import { api } from '../api';
import { Icon } from '../icons';
import { QUOTE_STYLE } from '../colors';
import { Nav, Sheet, useApp } from '../ui';

type Filter = 'all' | 'fav' | 'mine' | QuoteType;

export function Quotes() {
  const { state, run } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const [limit, setLimit] = useState(30);

  const list = state.quotes.filter((q) =>
    filter === 'all' ? true : filter === 'fav' ? q.favorite : filter === 'mine' ? q.custom : q.type === filter,
  );
  const count = (t: QuoteType) => state.quotes.filter((q) => q.type === t).length;

  const fav = (id: number, favorite: boolean) => run(() => api(`quotes/${id}`, 'PATCH', { favorite }));
  const remove = (id: number) => confirm('Supprimer cette citation ?') && run(() => api(`quotes/${id}`, 'DELETE'), 'Citation supprimée');

  const chip = (f: Filter, label: string, style?: { bg: string; fg: string; icon: string }) => (
    <button
      type="button"
      class={`chip ${style ? '' : 'solid'}`}
      aria-pressed={filter === f}
      style={style ? { background: style.bg, color: style.fg } : undefined}
      onClick={() => {
        setFilter(f);
        setLimit(30);
      }}
    >
      {style && <Icon name={style.icon} size={15} color={style.fg} stroke={2.2} />}
      {label}
    </button>
  );

  return (
    <main class="screen">
      <div class="between">
        <h1 class="h1">Citations</h1>
        <button type="button" class="icon-btn" aria-label="Ajouter une citation" onClick={() => setAdding(true)}>
          <Icon name="plus" size={20} stroke={2.4} />
        </button>
      </div>

      <div class="chips scroll">
        {chip('all', `Toutes · ${state.quotes.length}`)}
        {QUOTE_TYPES.map((t) => chip(t, `${QUOTE_TYPE_LABEL[t]} · ${count(t)}`, QUOTE_STYLE[t]))}
        {chip('fav', 'Favoris')}
        {chip('mine', 'Les miennes')}
      </div>

      <div class="stack" style={{ gap: '12px' }}>
        {list.slice(0, limit).map((q) => {
          const s = QUOTE_STYLE[q.type];
          return (
            <article class="quote-item" key={q.id}>
              <div class="between">
                <div class="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                  <span class="tag" style={{ background: s.bg, color: s.fg }}>
                    {QUOTE_TYPE_LABEL[q.type]}
                  </span>
                  {q.custom && (
                    <span class="tag" style={{ background: 'var(--sage)', color: 'var(--green)' }}>
                      Ajoutée par toi
                    </span>
                  )}
                </div>
                <div class="row" style={{ gap: '0' }}>
                  {q.custom && (
                    <button type="button" class="icon-btn plain" aria-label="Supprimer" onClick={() => remove(q.id)}>
                      <Icon name="trash" size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    class="icon-btn plain"
                    aria-label={q.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    aria-pressed={q.favorite}
                    onClick={() => fav(q.id, !q.favorite)}
                  >
                    <Icon name="heart" size={20} color={q.favorite ? '#D98E8E' : '#8C968F'} fill={q.favorite ? '#D98E8E' : 'none'} />
                  </button>
                </div>
              </div>
              <p>« {q.text} »</p>
              {q.author && <span class="sub">{q.author}</span>}
            </article>
          );
        })}
        {!list.length && (
          <div class="card empty">
            {filter === 'fav' ? 'Touche le cœur d’une citation pour la garder ici.' : 'Aucune citation ici pour l’instant.'}
          </div>
        )}
        {list.length > limit && (
          <button type="button" class="btn ghost" onClick={() => setLimit((l) => l + 30)}>
            Voir plus ({list.length - limit})
          </button>
        )}
      </div>

      {adding && <AddQuote onClose={() => setAdding(false)} initialType={QUOTE_TYPES.includes(filter as QuoteType) ? (filter as QuoteType) : 'motivation'} />}
      <Nav current="quotes" />
    </main>
  );
}

function AddQuote({ onClose, initialType }: { onClose: () => void; initialType: QuoteType }) {
  const { run } = useApp();
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState<QuoteType>(initialType);

  const save = async () => {
    if (!text.trim()) return;
    if (await run(() => api('quotes', 'POST', { text, author, type }), 'Citation ajoutée 🌿')) onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <div class="between">
        <h2 class="h2">Nouvelle citation</h2>
        <button type="button" class="icon-btn plain" aria-label="Fermer" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </div>
      <div class="stack" style={{ gap: '6px' }}>
        <label class="label" for="q-text">
          Citation
        </label>
        <textarea id="q-text" class="textarea" style={{ background: '#fff' }} value={text} maxLength={400} onInput={(e) => setText(e.currentTarget.value)} />
      </div>
      <div class="stack" style={{ gap: '6px' }}>
        <label class="label" for="q-author">
          Auteur (facultatif)
        </label>
        <input id="q-author" class="input" style={{ background: '#fff' }} value={author} maxLength={80} onInput={(e) => setAuthor(e.currentTarget.value)} />
      </div>
      <div class="qtypes">
        {QUOTE_TYPES.map((t) => (
          <button
            type="button"
            class="qtype"
            aria-pressed={type === t}
            style={{ background: QUOTE_STYLE[t].bg, color: QUOTE_STYLE[t].fg }}
            onClick={() => setType(t)}
          >
            <Icon name={QUOTE_STYLE[t].icon} size={20} color={QUOTE_STYLE[t].fg} />
            {QUOTE_TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <button type="button" class="btn" disabled={!text.trim()} onClick={save}>
        Ajouter
      </button>
    </Sheet>
  );
}
