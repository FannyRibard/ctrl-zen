import { useEffect, useState } from 'preact/hooks';
import type { HistoryItem } from '../../shared/types';
import { loadHistory } from '../api';
import { TopBar, useApp } from '../ui';
import { hm, relativeDay } from '../format';

export function History() {
  const { back, toast } = useApp();
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    loadHistory()
      .then(setItems)
      .catch((e) => {
        toast(e.message);
        setItems([]);
      });
  }, []);

  return (
    <main class="screen no-nav">
      <TopBar
        title="Historique"
        left={
          <button type="button" class="link-btn" onClick={back}>
            ‹ Retour
          </button>
        }
      />
      {items === null ? (
        <div class="empty">Chargement…</div>
      ) : items.length ? (
        <div class="stack" style={{ gap: '10px' }}>
          {items.map((h) => (
            <div class="card stack" style={{ gap: '4px', padding: '14px 16px' }} key={h.id}>
              <div class="between">
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{h.title}</span>
                <span class="sub" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {relativeDay(h.sentAt)} · {hm(h.sentAt)}
                </span>
              </div>
              {h.body.trim() && <span style={{ fontSize: '14px', color: 'var(--muted-2)', whiteSpace: 'pre-line' }}>{h.body}</span>}
              {h.sent === 0 && (
                <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600 }}>Aucun appareil n’a reçu cette notif</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div class="card empty">Rien n’a encore été envoyé.</div>
      )}
    </main>
  );
}
