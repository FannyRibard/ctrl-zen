import { useState } from 'preact/hooks';
import { Icon } from '../icons';
import { Sheet, useApp } from '../ui';
import { enablePush, isIOS, isStandalone, pushStatus, type PushStatus } from '../push';

/** Bandeau d'accueil tant que les notifications ne sont pas activées sur cet appareil. */
export function PushBanner() {
  const { pushOn } = useApp();
  const [open, setOpen] = useState(false);
  if (pushOn) return null;
  return (
    <>
      <button type="button" class="banner" style={{ border: 'none', textAlign: 'left', background: '#F9E3CC' }} onClick={() => setOpen(true)}>
        <span class="cat-badge" style={{ background: '#fff' }}>
          <Icon name="bell" size={20} color="#7A4E20" />
        </span>
        <span class="grow stack" style={{ gap: '1px' }}>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>Active les notifications</span>
          <span style={{ fontSize: '13px', color: '#6B4318' }}>Pour recevoir tes rappels sur ce téléphone</span>
        </span>
        <Icon name="chevron" size={18} color="#7A4E20" />
      </button>
      {open && <PushSetup onClose={() => setOpen(false)} />}
    </>
  );
}

export function PushSetup({ onClose }: { onClose: () => void }) {
  const { state, run, refreshPush, toast } = useApp();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const needsInstall = isIOS() && !isStandalone();

  const activate = async () => {
    const ok = await run(async () => {
      const s = await enablePush(state.vapidPublicKey);
      setStatus(s);
      await refreshPush();
      if (s === 'on') {
        toast('Notifications activées 🌿');
        onClose();
      }
    });
    if (!ok) setStatus(await pushStatus());
  };

  return (
    <Sheet onClose={onClose}>
      <div class="between">
        <h2 class="h2">Recevoir les notifs</h2>
        <button type="button" class="icon-btn plain" aria-label="Fermer" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </div>

      {needsInstall ? (
        <div class="card stack" style={{ gap: '14px' }}>
          <span style={{ fontSize: '15px', lineHeight: 1.45 }}>
            Sur iPhone, les notifications ne marchent que si Ctrl+Zen est sur ton écran d’accueil :
          </span>
          <div class="row">
            <span class="cat-badge" style={{ background: 'var(--sage)' }}>
              <Icon name="share" size={20} color="var(--green)" />
            </span>
            <span style={{ fontSize: '15px' }}>
              1. Dans Safari, touche <b>Partager</b>
            </span>
          </div>
          <div class="row">
            <span class="cat-badge" style={{ background: 'var(--sage)' }}>
              <Icon name="plus" size={20} color="var(--green)" />
            </span>
            <span style={{ fontSize: '15px' }}>
              2. Choisis <b>Sur l’écran d’accueil</b>
            </span>
          </div>
          <div class="row">
            <span class="cat-badge" style={{ background: 'var(--sage)' }}>
              <Icon name="bell" size={20} color="var(--green)" />
            </span>
            <span style={{ fontSize: '15px' }}>3. Ouvre Ctrl+Zen depuis l’icône, puis reviens ici</span>
          </div>
        </div>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.45, color: 'var(--muted-2)' }}>
            Ton téléphone va te demander l’autorisation. Accepte pour recevoir tes rappels, même quand l’app est fermée.
          </p>
          {status === 'denied' && (
            <p class="err" style={{ margin: 0 }}>
              Les notifications sont bloquées. Va dans Réglages iPhone → Notifications → Ctrl+Zen pour les autoriser.
            </p>
          )}
          {status === 'unsupported' && <p class="err" style={{ margin: 0 }}>Ce navigateur ne gère pas les notifications push.</p>}
          <button type="button" class="btn" onClick={activate}>
            <Icon name="bell" size={20} color="#fff" /> Activer
          </button>
        </>
      )}
    </Sheet>
  );
}
