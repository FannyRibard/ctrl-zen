import { useState } from 'preact/hooks';
import { api } from '../api';
import { CATEGORY_ICONS, ICON_LABEL, Icon } from '../icons';
import { COLORS, color } from '../colors';
import { CatBadge, Sheet, TopBar, useApp } from '../ui';

/** Formulaire de création / modification d'une catégorie (utilisé en fenêtre). */
export function CategoryForm({ id, onDone }: { id?: number; onDone: (newId?: number) => void }) {
  const { state, run } = useApp();
  const existing = id ? state.categories.find((c) => c.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [mode, setMode] = useState<'icon' | 'emoji'>(existing?.emoji ? 'emoji' : 'icon');
  const [icon, setIcon] = useState(existing?.icon ?? 'leaf');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '');
  const [col, setCol] = useState(existing?.color ?? 'menthe');
  const [busy, setBusy] = useState(false);

  const c = color(col);
  const cleanEmoji = [...emoji.trim()].slice(0, 2).join('');
  const preview = { id: 0, name, icon: mode === 'icon' ? icon : null, emoji: mode === 'emoji' ? cleanEmoji || null : null, color: col };

  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    let newId: number | undefined;
    const body = { name: name.trim(), icon: preview.icon, emoji: preview.emoji, color: col };
    const ok = await run(async () => {
      if (id) await api(`categories/${id}`, 'PUT', body);
      else newId = (await api<{ id: number }>('categories', 'POST', body)).id;
    }, id ? 'Catégorie modifiée' : 'Catégorie créée');
    setBusy(false);
    if (ok) onDone(newId);
  };

  const remove = async () => {
    if (!id || !confirm(`Supprimer la catégorie « ${existing?.name} » ? Les rappels qui l’utilisent resteront, sans catégorie.`)) return;
    if (await run(() => api(`categories/${id}`, 'DELETE'), 'Catégorie supprimée')) onDone();
  };

  return (
    <>
      <TopBar
        title={id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        left={
          <button type="button" class="link-btn" onClick={() => onDone()}>
            Annuler
          </button>
        }
        right={
          <button type="button" class="link-btn bold" disabled={!name.trim() || busy} onClick={save}>
            OK
          </button>
        }
      />

      <div class="stack" style={{ alignItems: 'center', gap: '12px' }}>
        <CatBadge cat={preview} size={88} round />
        <label for="cat-nom" style={{ position: 'absolute', left: '-9999px' }}>
          Nom de la catégorie
        </label>
        <input
          id="cat-nom"
          class="input"
          style={{ background: '#fff', width: '240px', textAlign: 'center', fontSize: '20px', fontWeight: 700, height: '50px' }}
          placeholder="Sport"
          value={name}
          maxLength={40}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </div>

      <div class="seg" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <button type="button" aria-pressed={mode === 'icon'} onClick={() => setMode('icon')}>
          Icônes
        </button>
        <button type="button" aria-pressed={mode === 'emoji'} onClick={() => setMode('emoji')}>
          Emoji
        </button>
      </div>

      {mode === 'icon' ? (
        <div class="card icon-grid" style={{ padding: '14px' }}>
          {CATEGORY_ICONS.map((n) => (
            <button type="button" aria-label={ICON_LABEL[n]} aria-pressed={icon === n} onClick={() => setIcon(n)}>
              <Icon name={n} size={22} color={icon === n ? '#fff' : c.fg} />
            </button>
          ))}
        </div>
      ) : (
        <div class="card stack">
          <label class="label" for="cat-emoji" style={{ paddingLeft: 0 }}>
            Tape un emoji avec le clavier 😊
          </label>
          <input
            id="cat-emoji"
            class="input"
            style={{ fontSize: '28px', textAlign: 'center', height: '60px' }}
            value={emoji}
            placeholder="🌱"
            onInput={(e) => setEmoji(e.currentTarget.value)}
          />
        </div>
      )}

      <div class="stack">
        <span class="label">Couleur</span>
        <div class="swatches">
          {Object.entries(COLORS).map(([k, v]) => (
            <button type="button" aria-label={v.label} aria-pressed={col === k} style={{ background: v.bg }} onClick={() => setCol(k)} />
          ))}
        </div>
      </div>

      <button type="button" class="btn" disabled={!name.trim() || busy} onClick={save}>
        {id ? 'Enregistrer' : 'Créer la catégorie'}
      </button>
      {id && (
        <button type="button" class="btn danger" onClick={remove}>
          <Icon name="trash" size={18} /> Supprimer
        </button>
      )}
    </>
  );
}

/** Écran « Mes catégories » (depuis Réglages). */
export function Categories() {
  const { state, back } = useApp();
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  return (
    <main class="screen no-nav">
      <TopBar
        title="Mes catégories"
        left={
          <button type="button" class="link-btn" onClick={back}>
            ‹ Retour
          </button>
        }
        right={
          <button type="button" class="link-btn bold" onClick={() => setEditing('new')}>
            Ajouter
          </button>
        }
      />
      <div class="card flat">
        {state.categories.map((c) => (
          <button type="button" class="list-row" onClick={() => setEditing(c.id)}>
            <span class="k">
              <CatBadge cat={c} size={34} round />
              {c.name}
            </span>
            <Icon name="chevron" size={18} color="var(--muted)" />
          </button>
        ))}
        {!state.categories.length && <div class="empty">Aucune catégorie pour l’instant.</div>}
      </div>
      {editing !== null && (
        <Sheet onClose={() => setEditing(null)}>
          <CategoryForm id={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </main>
  );
}
