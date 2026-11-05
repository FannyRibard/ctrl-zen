import { describeSchedule } from '../../shared/schedule';
import { api } from '../api';
import { Icon } from '../icons';
import { CatBadge, Switch, TopBar, useApp } from '../ui';
import { hm, relativeDay } from '../format';

/** Tous les rappels programmés, avec un interrupteur pour les mettre en pause. */
export function Reminders() {
  const { state, go, back, run } = useApp();
  const list = state.notifications.filter((n) => !n.system);

  return (
    <main class="screen no-nav">
      <TopBar
        title="Mes rappels"
        left={
          <button type="button" class="link-btn" onClick={back}>
            ‹ Retour
          </button>
        }
        right={
          <button type="button" class="link-btn bold" onClick={() => go({ name: 'editor', mode: 'notif' })}>
            Ajouter
          </button>
        }
      />
      <div class="stack" style={{ gap: '10px' }}>
        {list.map((n) => {
          const cat = state.categories.find((c) => c.id === n.categoryId);
          return (
            <div class={`notif-card ${n.active ? '' : 'off'}`} key={n.id} style={{ flex: 'none' }}>
              <button
                type="button"
                style={{ border: 'none', background: 'none', padding: 0, display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0, textAlign: 'left', color: 'inherit' }}
                onClick={() => go({ name: 'editor', mode: 'notif', id: n.id })}
              >
                <CatBadge cat={cat} />
                <span class="grow stack" style={{ gap: '1px' }}>
                  <span class="notif-title">{n.title}</span>
                  <span class="notif-sub">{describeSchedule(n.schedule)}</span>
                  <span class="notif-sub" style={{ fontSize: '12px' }}>
                    {n.active && n.nextRun ? `Prochaine : ${relativeDay(n.nextRun)} à ${hm(n.nextRun)}` : n.active ? '' : 'En pause'}
                  </span>
                </span>
              </button>
              <Switch
                on={n.active}
                label={n.active ? `Mettre ${n.title} en pause` : `Réactiver ${n.title}`}
                onChange={(v) => run(() => api(`notifications/${n.id}`, 'PATCH', { active: v }), v ? 'Rappel réactivé' : 'Rappel en pause')}
              />
            </div>
          );
        })}
        {!list.length && (
          <div class="card empty">
            Aucun rappel pour l’instant.
            <br />
            <button type="button" class="btn ghost" onClick={() => go({ name: 'editor', mode: 'notif' })}>
              <Icon name="plus" size={18} /> Créer un rappel
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
