import { useMemo, useState } from 'preact/hooks';
import type { NotifInput, QuoteType, Schedule } from '../../shared/types';
import { QUOTE_TYPES } from '../../shared/types';
import { NOTIF_BODY_BUDGET, QUOTE_TYPE_LABEL, composeBody, quoteBudget } from '../../shared/meta';
import { describeSchedule } from '../../shared/schedule';
import { api } from '../api';
import { Icon } from '../icons';
import { QUOTE_STYLE, color } from '../colors';
import { CatBadge, NotifPreview, Sheet, Switch, TopBar, catEmoji, useApp } from '../ui';
import { inOneHour } from '../format';
import { CategoryForm } from './Category';

type When = 'now' | 'once' | 'daily' | 'interval';
const DAYS = [
  { v: 1, l: 'L' },
  { v: 2, l: 'M' },
  { v: 3, l: 'M' },
  { v: 4, l: 'J' },
  { v: 5, l: 'V' },
  { v: 6, l: 'S' },
  { v: 0, l: 'D' },
];
const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const EVERY = [30, 60, 90, 120, 180, 240];

export function Editor({ mode, id, templateId }: { mode: 'notif' | 'template'; id?: number; templateId?: number }) {
  const { state, back, run } = useApp();
  const isTemplate = mode === 'template';
  const existing = id
    ? isTemplate
      ? state.templates.find((t) => t.id === id)
      : state.notifications.find((n) => n.id === id)
    : undefined;
  const existingSchedule: Schedule | undefined = existing && 'schedule' in existing ? (existing.schedule as Schedule) : undefined;
  // Nouveau rappel préparé à partir d'un modèle : on reprend son contenu, il ne reste qu'à choisir « Quand ? ».
  const source = existing ?? (templateId ? state.templates.find((t) => t.id === templateId) : undefined);

  const [title, setTitle] = useState(source?.title ?? '');
  const [body, setBody] = useState(source?.body ?? '');
  const [useQuote, setUseQuote] = useState(source?.useQuote ?? false);
  const [quoteTypes, setQuoteTypes] = useState<QuoteType[]>(source?.quoteTypes?.length ? source.quoteTypes : ['motivation']);
  const [categoryId, setCategoryId] = useState<number | null>(source ? source.categoryId : state.categories[0]?.id ?? null);
  const [pickTemplate, setPickTemplate] = useState(false);
  const [fromTemplate, setFromTemplate] = useState(templateId && !existing ? source?.title : undefined);

  const applyTemplate = (tid: number) => {
    const t = state.templates.find((x) => x.id === tid);
    if (!t) return;
    setTitle(t.title);
    setBody(t.body);
    setUseQuote(t.useQuote);
    setQuoteTypes(t.quoteTypes.length ? t.quoteTypes : ['motivation']);
    setCategoryId(t.categoryId);
    setFromTemplate(t.title);
    setPickTemplate(false);
  };
  const [when, setWhen] = useState<When>(existingSchedule?.kind ?? (isTemplate ? 'now' : 'daily'));
  const [at, setAt] = useState(existingSchedule?.at ?? inOneHour());
  const [days, setDays] = useState<number[]>(existingSchedule?.days ?? [1, 2, 3, 4, 5]);
  const [time, setTime] = useState(existingSchedule?.time ?? '09:00');
  const [every, setEvery] = useState(existingSchedule?.every ?? 120);
  const [start, setStart] = useState(existingSchedule?.start ?? '09:00');
  const [end, setEnd] = useState(existingSchedule?.end ?? '19:00');
  const [busy, setBusy] = useState(false);
  const [showCat, setShowCat] = useState(false);

  const cat = state.categories.find((c) => c.id === categoryId);
  // Même règle que le serveur : une citation qui tient dans la notif sans « … ».
  const budget = quoteBudget(body);
  const sampleQuote = useMemo(() => {
    const pool = state.quotes.filter((q) => quoteTypes.includes(q.type));
    const fits = pool.filter((q) => q.text.length <= budget);
    const from = fits.length ? fits : [...pool].sort((a, b) => a.text.length - b.text.length).slice(0, 1);
    return from[Math.floor(Math.random() * from.length)];
  }, [quoteTypes.join(','), state.quotes.length, Math.floor(budget / 20)]);

  const previewBody = useQuote && sampleQuote ? composeBody(body, sampleQuote) : body || 'Ton message ici';
  const tooLong = body.trim().length > NOTIF_BODY_BUDGET - (useQuote ? 40 : 0);
  const previewTitle = `${catEmoji(cat) ? `${catEmoji(cat)} ` : ''}${title}`;

  const schedule = (): Schedule => {
    if (when === 'once') return { kind: 'once', at };
    if (when === 'daily') return { kind: 'daily', days, time };
    return { kind: 'interval', days, every, start, end };
  };

  const input = (): NotifInput => ({ title: title.trim(), body: body.trim(), categoryId, useQuote, quoteTypes, schedule: schedule() });

  const toggleType = (t: QuoteType) =>
    setQuoteTypes((cur) => (cur.includes(t) ? (cur.length > 1 ? cur.filter((x) => x !== t) : cur) : [...cur, t]));
  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? (cur.length > 1 ? cur.filter((x) => x !== d) : cur) : [...cur, d]));

  const valid = title.trim().length > 0 && (when !== 'once' || at) && (when === 'now' || when === 'once' || days.length > 0);

  const act = async (fn: () => Promise<unknown>, msg: string, then: () => void = back) => {
    if (busy) return;
    setBusy(true);
    const ok = await run(fn, msg);
    setBusy(false);
    if (ok) then();
  };

  const primary = () => {
    if (isTemplate) {
      return act(() => (id ? api(`templates/${id}`, 'PUT', input()) : api('templates', 'POST', input())), 'Modèle enregistré');
    }
    if (when === 'now') {
      return act(() => api('send', 'POST', input()), 'Notif envoyée 🌿');
    }
    return act(
      () => (id ? api(`notifications/${id}`, 'PUT', input()) : api('notifications', 'POST', input())),
      id ? 'Rappel mis à jour' : 'Rappel programmé 🌿',
    );
  };

  const saveAsTemplate = () => act(() => api('templates', 'POST', input()), 'Gardé dans tes modèles', () => {});

  const remove = () => {
    if (!id || !confirm(isTemplate ? 'Supprimer ce modèle ?' : 'Supprimer ce rappel ?')) return;
    act(() => api(`${isTemplate ? 'templates' : 'notifications'}/${id}`, 'DELETE'), 'Supprimé');
  };

  const primaryLabel = isTemplate ? 'Enregistrer' : when === 'now' ? 'Envoyer' : id ? 'Enregistrer' : 'Programmer';
  const heading = isTemplate ? (id ? 'Modifier le modèle' : 'Nouveau modèle') : id ? 'Modifier le rappel' : 'Nouvelle notif';

  return (
    <main class="screen no-nav">
      <TopBar
        title={heading}
        left={
          <button type="button" class="link-btn" onClick={back}>
            Annuler
          </button>
        }
        right={
          !isTemplate && !id ? (
            <button type="button" class="link-btn" onClick={() => setPickTemplate(true)}>
              Modèles
            </button>
          ) : undefined
        }
      />

      <NotifPreview title={previewTitle} body={previewBody} />

      {fromTemplate && (
        <div class="row" style={{ background: 'var(--sage)', borderRadius: '16px', padding: '10px 14px', gap: '10px', fontSize: '14px' }}>
          <Icon name="layers" size={18} color="var(--green)" />
          <span class="grow">
            D’après ton modèle <b>« {fromTemplate} »</b>. Choisis <b>Quand ?</b> plus bas pour le programmer.
          </span>
        </div>
      )}

      <div class="stack" style={{ gap: '6px' }}>
        <label class="label" for="titre">
          Titre
        </label>
        <input
          id="titre"
          class="field-title"
          value={title}
          placeholder="Pause respiration"
          maxLength={120}
          onInput={(e) => setTitle(e.currentTarget.value)}
        />
      </div>

      <div class="stack" style={{ gap: '6px' }}>
        <label class="label" for="message">
          Message {useQuote ? '(facultatif)' : ''}
        </label>
        <textarea
          id="message"
          class="textarea"
          style={{ background: '#fff' }}
          value={body}
          placeholder={useQuote ? 'Un petit mot avant la citation…' : 'Inspire… expire… tu gères.'}
          maxLength={500}
          onInput={(e) => setBody(e.currentTarget.value)}
        />
        {tooLong && (
          <span class="sub" style={{ fontSize: '12px', padding: '0 4px', color: '#7A4E20' }}>
            Message un peu long : l’iPhone risque de le couper avec « … » (appui long sur la notif pour tout lire).
          </span>
        )}
      </div>

      <div class="card stack" style={{ gap: '12px' }}>
        <div class="between">
          <div class="stack" style={{ gap: '2px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>Citation au hasard</span>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Une nouvelle à chaque envoi</span>
          </div>
          <Switch on={useQuote} onChange={setUseQuote} label="Ajouter une citation au hasard" />
        </div>
        {useQuote && (
          <div class="qtypes">
            {QUOTE_TYPES.map((t) => (
              <button
                type="button"
                class="qtype"
                aria-pressed={quoteTypes.includes(t)}
                style={{ background: QUOTE_STYLE[t].bg, color: QUOTE_STYLE[t].fg }}
                onClick={() => toggleType(t)}
              >
                <Icon name={QUOTE_STYLE[t].icon} size={20} color={QUOTE_STYLE[t].fg} />
                {QUOTE_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div class="stack">
        <span class="label">Catégorie</span>
        <div class="cats">
          {state.categories.map((c) => {
            const col = color(c.color);
            return (
              <button type="button" class="cat-pick" aria-pressed={c.id === categoryId} onClick={() => setCategoryId(c.id)}>
                <span class="dot" style={{ background: col.bg }}>
                  {c.emoji || <Icon name={c.icon || 'bell'} size={22} color={col.fg} />}
                </span>
                <span>{c.name}</span>
              </button>
            );
          })}
          <button type="button" class="cat-pick" aria-pressed={categoryId === null} onClick={() => setCategoryId(null)}>
            <span class="dot" style={{ background: '#fff' }}>
              <Icon name="bell" size={22} color="var(--muted)" />
            </span>
            <span>Aucune</span>
          </button>
          <button type="button" class="cat-pick" onClick={() => setShowCat(true)}>
            <span class="dot add">
              <Icon name="plus" size={18} color="var(--muted-2)" stroke={2.4} />
            </span>
            <span>Créer</span>
          </button>
        </div>
      </div>

      {!isTemplate && (
        <div class="stack" style={{ gap: '10px' }}>
          <span class="label">Quand ?</span>
          <div class="seg" style={{ gridTemplateColumns: `repeat(${id ? 3 : 4}, minmax(0, 1fr))` }}>
            {(id ? (['once', 'daily', 'interval'] as When[]) : (['now', 'once', 'daily', 'interval'] as When[])).map((w) => (
              <button type="button" aria-pressed={when === w} onClick={() => setWhen(w)}>
                {{ now: 'Direct', once: 'Une fois', daily: 'Chaque jour', interval: 'Plusieurs' }[w]}
              </button>
            ))}
          </div>

          {when === 'now' && <p class="sub" style={{ margin: '0 4px' }}>Elle part tout de suite sur ton téléphone.</p>}

          {when === 'once' && (
            <div class="card flat">
              <div class="list-row">
                <label class="k" for="quand">
                  <Icon name="calendar" size={18} color="var(--green)" /> Date et heure
                </label>
                <input
                  id="quand"
                  type="datetime-local"
                  class="input time"
                  style={{ minWidth: '190px' }}
                  value={at}
                  onInput={(e) => setAt(e.currentTarget.value)}
                />
              </div>
            </div>
          )}

          {(when === 'daily' || when === 'interval') && (
            <div class="card stack" style={{ gap: '12px' }}>
              <div class="days" role="group" aria-label="Jours">
                {DAYS.map((d) => (
                  <button type="button" aria-pressed={days.includes(d.v)} aria-label={DAY_NAMES[d.v]} onClick={() => toggleDay(d.v)}>
                    {d.l}
                  </button>
                ))}
              </div>
              {when === 'daily' ? (
                <div class="between">
                  <label class="row" for="heure" style={{ fontSize: '15px', fontWeight: 500, gap: '8px' }}>
                    <Icon name="clock" size={18} color="var(--green)" /> À quelle heure
                  </label>
                  <input id="heure" type="time" class="input time" value={time} onInput={(e) => setTime(e.currentTarget.value)} />
                </div>
              ) : (
                <>
                  <div class="between">
                    <label class="row" for="every" style={{ fontSize: '15px', fontWeight: 500, gap: '8px' }}>
                      <Icon name="repeat" size={18} color="var(--green)" /> Toutes les
                    </label>
                    <select id="every" class="select input time" value={every} onChange={(e) => setEvery(Number(e.currentTarget.value))}>
                      {EVERY.map((m) => (
                        <option value={m}>{m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h 30` : `${m / 60} h`}</option>
                      ))}
                    </select>
                  </div>
                  <div class="between">
                    <span class="row" style={{ fontSize: '15px', fontWeight: 500, gap: '8px' }}>
                      <Icon name="clock" size={18} color="var(--green)" /> Entre
                    </span>
                    <div class="row" style={{ gap: '6px' }}>
                      <input type="time" aria-label="Début" class="input time" value={start} onInput={(e) => setStart(e.currentTarget.value)} />
                      <span>et</span>
                      <input type="time" aria-label="Fin" class="input time" value={end} onInput={(e) => setEnd(e.currentTarget.value)} />
                    </div>
                  </div>
                </>
              )}
              <span class="sub">{describeSchedule(schedule())}</span>
            </div>
          )}
        </div>
      )}

      <div class="stack" style={{ marginTop: 'auto', gap: '8px' }}>
        {!isTemplate && !id && !fromTemplate ? (
          <div class="btn-row">
            <button type="button" class="btn secondary" disabled={!valid || busy} onClick={saveAsTemplate}>
              Garder en modèle
            </button>
            <button type="button" class="btn" disabled={!valid || busy} onClick={primary}>
              {primaryLabel}
            </button>
          </div>
        ) : (
          <button type="button" class="btn" disabled={!valid || busy} onClick={primary}>
            {primaryLabel}
          </button>
        )}
        {id && (
          <button type="button" class="btn danger" onClick={remove}>
            <Icon name="trash" size={18} /> Supprimer
          </button>
        )}
      </div>

      {pickTemplate && (
        <Sheet onClose={() => setPickTemplate(false)}>
          <div class="between">
            <h2 class="h2">Partir d’un modèle</h2>
            <button type="button" class="icon-btn plain" aria-label="Fermer" onClick={() => setPickTemplate(false)}>
              <Icon name="x" size={20} />
            </button>
          </div>
          <div class="card flat">
            {state.templates.map((t) => (
              <button type="button" class="list-row" onClick={() => applyTemplate(t.id)}>
                <span class="k">
                  <CatBadge cat={state.categories.find((c) => c.id === t.categoryId)} size={34} round />
                  {t.title}
                </span>
                <Icon name="chevron" size={18} color="var(--muted)" />
              </button>
            ))}
            {!state.templates.length && <div class="empty">Tu n’as pas encore de modèle.</div>}
          </div>
        </Sheet>
      )}

      {showCat && (
        <Sheet onClose={() => setShowCat(false)}>
          <CategoryForm
            onDone={(newId) => {
              setShowCat(false);
              if (newId) setCategoryId(newId);
            }}
          />
        </Sheet>
      )}
    </main>
  );
}
