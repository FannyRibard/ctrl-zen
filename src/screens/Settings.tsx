import { useState } from 'preact/hooks';
import type { QuoteType } from '../../shared/types';
import { QUOTE_TYPES } from '../../shared/types';
import { QUOTE_TYPE_LABEL } from '../../shared/meta';
import { api, getKey, setKey } from '../api';
import { Icon } from '../icons';
import { QUOTE_STYLE } from '../colors';
import { Nav, Switch, useApp } from '../ui';
import { getName, setName } from '../prefs';
import { PushSetup } from './PushBanner';

export function Settings() {
  const { state, go, run, pushOn, toast } = useApp();
  const [setup, setSetup] = useState(false);
  const [name, setNameState] = useState(getName());
  const [showKey, setShowKey] = useState(false);
  const daily = state.notifications.find((n) => n.system === 'daily_quote');
  const s = state.settings;
  const phoneTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sendUrl = `${location.origin}/api/send`;

  const patchDaily = (body: object, msg?: string) => daily && run(() => api(`notifications/${daily.id}`, 'PATCH', body), msg);
  const toggleDailyType = (t: QuoteType) => {
    if (!daily) return;
    const cur = daily.quoteTypes;
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    if (next.length) patchDaily({ quoteTypes: next });
  };
  const saveSettings = (body: object, msg?: string) => run(() => api('settings', 'PUT', body), msg);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copiée`);
    } catch {
      toast('Copie impossible, sélectionne le texte à la main');
    }
  };

  return (
    <main class="screen">
      <h1 class="h1">Réglages</h1>

      {pushOn ? (
        <div class="banner">
          <span class="cat-badge" style={{ background: 'var(--green)', borderRadius: '50%' }}>
            <Icon name="check" size={20} color="#fff" stroke={2.6} />
          </span>
          <div class="grow stack" style={{ gap: '1px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>Notifications activées</span>
            <span style={{ fontSize: '13px', color: '#3F5A45' }}>
              {state.devices} appareil{state.devices > 1 ? 's' : ''} connecté{state.devices > 1 ? 's' : ''}
            </span>
          </div>
          <button type="button" class="btn small" style={{ background: '#fff', color: 'var(--green)' }} onClick={() => run(() => api('test', 'POST'), 'Notif de test envoyée')}>
            Tester
          </button>
        </div>
      ) : (
        <button type="button" class="banner" style={{ border: 'none', textAlign: 'left', background: '#F9E3CC' }} onClick={() => setSetup(true)}>
          <span class="cat-badge" style={{ background: '#fff' }}>
            <Icon name="bell" size={20} color="#7A4E20" />
          </span>
          <span class="grow" style={{ fontWeight: 700, fontSize: '15px' }}>
            Activer les notifications sur ce téléphone
          </span>
          <Icon name="chevron" size={18} color="#7A4E20" />
        </button>
      )}

      {daily && (
        <section class="stack" style={{ gap: '6px' }}>
          <span class="label">Citation du jour</span>
          <div class="card flat">
            <div class="list-row">
              <span class="k">Activée</span>
              <Switch on={daily.active} label="Citation du jour" onChange={(v) => patchDaily({ active: v })} />
            </div>
            <div class="list-row">
              <label class="k" for="daily-time">
                Heure
              </label>
              <input
                id="daily-time"
                type="time"
                class="input time"
                style={{ background: 'transparent' }}
                value={daily.schedule.time}
                onChange={(e) => patchDaily({ time: e.currentTarget.value }, 'Heure enregistrée')}
              />
            </div>
            <div class="stack" style={{ padding: '12px 0 14px', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 500 }}>Types de citations</span>
              <div class="chips">
                {QUOTE_TYPES.map((t) => (
                  <button
                    type="button"
                    class="chip"
                    aria-pressed={daily.quoteTypes.includes(t)}
                    style={{ background: daily.quoteTypes.includes(t) ? QUOTE_STYLE[t].bg : '#F2F0EA', color: QUOTE_STYLE[t].fg, height: '34px', fontSize: '13px' }}
                    onClick={() => toggleDailyType(t)}
                  >
                    {QUOTE_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section class="stack" style={{ gap: '6px' }}>
        <span class="label">Général</span>
        <div class="card flat">
          <div class="list-row">
            <label class="k" for="prenom">
              <Icon name="smile" size={18} color="var(--green)" /> Ton prénom
            </label>
            <input
              id="prenom"
              class="input"
              style={{ background: 'transparent', textAlign: 'right', width: '150px', fontWeight: 600, color: 'var(--green)', padding: 0 }}
              placeholder="facultatif"
              value={name}
              onInput={(e) => setNameState(e.currentTarget.value)}
              onBlur={() => setName(name)}
            />
          </div>
          <div class="list-row">
            <span class="k">
              <Icon name="moon" size={18} color="var(--green)" /> Mode calme la nuit
            </span>
            <Switch on={s.quietEnabled} label="Mode calme" onChange={(v) => saveSettings({ quietEnabled: v })} />
          </div>
          {s.quietEnabled && (
            <div class="list-row">
              <span class="k" style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Pas de rappels réguliers entre
              </span>
              <div class="row" style={{ gap: '4px' }}>
                <input type="time" aria-label="Début du mode calme" class="input time" style={{ background: 'transparent', minWidth: '80px', padding: 0 }} value={s.quietStart} onChange={(e) => saveSettings({ quietStart: e.currentTarget.value })} />
                <span>→</span>
                <input type="time" aria-label="Fin du mode calme" class="input time" style={{ background: 'transparent', minWidth: '80px', padding: 0 }} value={s.quietEnd} onChange={(e) => saveSettings({ quietEnd: e.currentTarget.value })} />
              </div>
            </div>
          )}
          <button type="button" class="list-row" onClick={() => go({ name: 'reminders' })}>
            <span class="k">
              <Icon name="bell" size={18} color="var(--green)" /> Mes rappels
            </span>
            <span class="sub">
              {state.notifications.filter((n) => !n.system).length} ›
            </span>
          </button>
          <button type="button" class="list-row" onClick={() => go({ name: 'categories' })}>
            <span class="k">
              <Icon name="grid" size={18} color="var(--green)" /> Mes catégories
            </span>
            <span class="sub">{state.categories.length} ›</span>
          </button>
          <button type="button" class="list-row" onClick={() => go({ name: 'history' })}>
            <span class="k">
              <Icon name="history" size={18} color="var(--green)" /> Historique des envois
            </span>
            <span class="sub">›</span>
          </button>
        </div>
        {s.timezone !== phoneTz && (
          <button type="button" class="btn ghost" onClick={() => saveSettings({ timezone: phoneTz }, `Fuseau : ${phoneTz}`)}>
            Fuseau actuel : {s.timezone} — utiliser {phoneTz}
          </button>
        )}
      </section>

      <section class="stack" style={{ gap: '6px' }}>
        <span class="label">Raccourcis iOS &amp; automatisations</span>
        <div class="card stack" style={{ gap: '10px' }}>
          <button type="button" class="list-row" style={{ minHeight: '56px' }} onClick={() => go({ name: 'guide' })}>
            <span class="k">
              <span class="cat-badge" style={{ background: 'var(--sage)', width: '36px', height: '36px', borderRadius: '10px' }}>
                <Icon name="zap" size={18} color="var(--green)" />
              </span>
              <span class="stack" style={{ gap: '1px' }}>
                <span style={{ fontWeight: 700 }}>Guide pas à pas</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Recevoir une notif en arrivant chez toi, en ouvrant une app…</span>
              </span>
            </span>
            <Icon name="chevron" size={18} color="var(--muted)" />
          </button>
          <div class="row" style={{ background: 'var(--field)', borderRadius: '14px', padding: '8px 8px 8px 12px' }}>
            <code class="mono grow">{sendUrl}</code>
            <button type="button" class="btn small" onClick={() => copy(sendUrl, 'Adresse')}>
              <Icon name="copy" size={14} color="#fff" /> Copier
            </button>
          </div>
          <div class="between">
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Clé secrète</span>
            <div class="row" style={{ gap: '6px' }}>
              <code class="mono" style={{ color: 'var(--muted)' }}>{showKey ? getKey() : `•••• ${getKey().slice(-4)}`}</code>
              <button type="button" class="icon-btn plain" aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'} onClick={() => setShowKey(!showKey)}>
                <Icon name="key" size={18} />
              </button>
              <button type="button" class="icon-btn plain" aria-label="Copier la clé" onClick={() => copy(getKey(), 'Clé')}>
                <Icon name="copy" size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        class="btn danger"
        onClick={() => {
          if (confirm('Se déconnecter de Ctrl+Zen sur cet appareil ?')) {
            setKey('');
            location.reload();
          }
        }}
      >
        <Icon name="logout" size={18} /> Se déconnecter
      </button>

      {setup && <PushSetup onClose={() => setSetup(false)} />}
      <Nav current="settings" />
    </main>
  );
}
