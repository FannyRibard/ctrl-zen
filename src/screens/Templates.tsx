import { useState } from 'preact/hooks';
import { QUOTE_TYPE_LABEL } from '../../shared/meta';
import { api } from '../api';
import { Icon } from '../icons';
import { color } from '../colors';
import { Nav, useApp } from '../ui';

export function Templates() {
  const { state, go, run } = useApp();
  const [sending, setSending] = useState<number | null>(null);

  const send = async (id: number) => {
    setSending(id);
    await run(() => api(`templates/${id}/send`, 'POST'), 'Envoyée 🌿');
    setSending(null);
  };

  return (
    <main class="screen">
      <div class="stack" style={{ gap: '4px' }}>
        <h1 class="h1">Modèles</h1>
        <span style={{ fontSize: '15px', color: 'var(--muted)' }}>Un tap pour t’envoyer une notif toute prête.</span>
      </div>

      <div class="tpl-grid">
        {state.templates.map((t) => {
          const cat = state.categories.find((c) => c.id === t.categoryId);
          const c = color(cat?.color);
          const sub = t.useQuote ? `+ citation ${t.quoteTypes.map((q) => QUOTE_TYPE_LABEL[q]).join(', ')}` : cat?.name ?? '';
          return (
            <div class="tpl" style={{ background: c.bg }} key={t.id}>
              <button
                type="button"
                style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, color: 'inherit' }}
                onClick={() => go({ name: 'editor', mode: 'template', id: t.id })}
                aria-label={`Modifier le modèle ${t.title}`}
              >
                <span class="ico">{cat?.emoji || <Icon name={cat?.icon || 'bell'} size={20} color={c.fg} />}</span>
                <span class="stack" style={{ gap: '2px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>{t.title}</span>
                  <span style={{ fontSize: '12px', color: c.fg }}>{sub}</span>
                </span>
              </button>
              <div class="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" class="btn small" style={{ padding: '0 12px' }} disabled={sending === t.id} onClick={() => send(t.id)}>
                  <Icon name="send" size={14} color="#fff" stroke={2.4} /> {sending === t.id ? 'Envoi…' : 'Envoyer'}
                </button>
                <button
                  type="button"
                  class="btn small"
                  style={{ padding: '0 12px', background: 'rgba(255,255,255,0.75)', color: 'var(--green)' }}
                  onClick={() => go({ name: 'editor', mode: 'notif', templateId: t.id })}
                >
                  <Icon name="clock" size={14} stroke={2.4} /> Programmer
                </button>
              </div>
            </div>
          );
        })}
        <button type="button" class="tpl new" onClick={() => go({ name: 'editor', mode: 'template' })}>
          <Icon name="plus" size={24} stroke={2.2} />
          Nouveau modèle
        </button>
      </div>
      <Nav current="templates" />
    </main>
  );
}
