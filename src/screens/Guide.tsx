import type { ComponentChildren } from 'preact';
import { getKey } from '../api';
import { Icon } from '../icons';
import { color } from '../colors';
import { TopBar, useApp } from '../ui';

/** Guide pas à pas : déclencher une notif Ctrl+Zen depuis l'app Raccourcis d'Apple. */
export function Guide() {
  const { state, back, toast } = useApp();
  const url = `${location.origin}/api/send`;
  const auth = `Bearer ${getKey()}`;

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copié`);
    } catch {
      toast('Copie impossible, sélectionne le texte à la main');
    }
  };

  const CopyRow = ({ label, value, shown, what }: { label: string; value: string; shown?: string; what: string }) => (
    <div class="stack" style={{ gap: '4px' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>{label}</span>
      <div class="row" style={{ background: 'var(--field)', borderRadius: '12px', padding: '6px 6px 6px 12px', gap: '8px' }}>
        <code class="mono grow">{shown ?? value}</code>
        <button type="button" class="btn small" onClick={() => copy(value, what)}>
          <Icon name="copy" size={14} color="#fff" /> Copier
        </button>
      </div>
    </div>
  );

  return (
    <main class="screen no-nav">
      <TopBar
        title="Guide Raccourcis"
        left={
          <button type="button" class="link-btn" onClick={back}>
            ‹ Retour
          </button>
        }
      />

      <div class="banner" style={{ alignItems: 'flex-start' }}>
        <span class="cat-badge" style={{ background: '#fff' }}>
          <Icon name="zap" size={20} color="var(--green)" />
        </span>
        <span style={{ fontSize: '14px', lineHeight: 1.45 }}>
          Le but : recevoir une notif Ctrl+Zen <b>au bon moment</b> (en arrivant chez toi, en ouvrant Instagram…) plutôt qu’à une heure fixe.
          On le fait en 2 temps : <b>créer un raccourci</b>, puis <b>une automatisation</b> qui le lance.
        </span>
      </div>

      <Part n={1} title="Créer le raccourci">
        <Step n={1}>
          Ouvre l’app <b>Raccourcis</b>, onglet <b>Raccourcis</b>, puis touche <b>+</b> en haut à droite.
        </Step>
        <Step n={2}>
          Touche <b>Ajouter une action</b>, cherche <b>« Obtenir le contenu de l’URL »</b> et choisis-la.
        </Step>
        <Step n={3}>
          Touche le mot bleu <b>URL</b> et colle cette adresse :
          <CopyRow label="Adresse" value={url} what="Adresse" />
        </Step>
        <Step n={4}>
          Touche la petite flèche <b>›</b> de l’action pour voir les options, puis mets <b>Méthode</b> sur <b>POST</b>.
        </Step>
        <Step n={5}>
          Dans <b>En-têtes</b>, touche <b>Ajouter un nouvel en-tête</b> :
          <CopyRow label="Clé" value="Authorization" what="Nom" />
          <CopyRow label="Texte (ta clé secrète)" value={auth} shown={`Bearer •••• ${getKey().slice(-4)}`} what="Texte" />
        </Step>
        <Step n={6}>
          Dans <b>Corps de la requête</b>, choisis <b>JSON</b>, puis touche <b>Ajouter un nouveau champ</b>. Deux possibilités :
          <div class="card stack" style={{ background: 'var(--field)', gap: '8px', padding: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>A. Envoyer un de tes modèles</span>
            <span style={{ fontSize: '13px', color: 'var(--muted-2)' }}>
              Type <b>Nombre</b>, clé <code class="mono">templateId</code>, valeur = le numéro du modèle :
            </span>
            <div class="stack" style={{ gap: '6px' }}>
              {state.templates.map((t) => {
                const cat = state.categories.find((c) => c.id === t.categoryId);
                return (
                  <div class="between" key={t.id} style={{ background: '#fff', borderRadius: '12px', padding: '8px 12px' }}>
                    <span class="row" style={{ gap: '8px', fontSize: '14px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color(cat?.color).fg, flexShrink: 0 }} />
                      {t.title}
                    </span>
                    <b style={{ fontSize: '16px', color: 'var(--green)' }}>{t.id}</b>
                  </div>
                );
              })}
            </div>
          </div>
          <div class="card stack" style={{ background: 'var(--field)', gap: '6px', padding: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>B. Écrire ta propre notif</span>
            <span style={{ fontSize: '13px', color: 'var(--muted-2)', lineHeight: 1.5 }}>
              Ajoute des champs de type <b>Texte</b> :
              <br />• <code class="mono">title</code> : le titre (ex. « Pause »)
              <br />• <code class="mono">body</code> : le message (facultatif)
              <br />• <code class="mono">quote</code> : pour ajouter une citation — <code class="mono">motivation</code>,{' '}
              <code class="mono">psychologie</code>, <code class="mono">philosophie</code> ou <code class="mono">any</code> (au hasard)
            </span>
          </div>
        </Step>
        <Step n={7}>
          Touche le nom en haut pour le <b>renommer</b> (ex. « Pause Zen »), puis <b>OK</b>. Teste-le avec le bouton <b>▶</b> : la notif doit arriver.
        </Step>
        <Tip>
          Le nom du raccourci marche aussi avec Siri : « Dis Siri, Pause Zen ».
        </Tip>
      </Part>

      <Part n={2} title="Le lancer automatiquement">
        <Step n={1}>
          Dans Raccourcis, onglet <b>Automatisation</b>, touche <b>+</b>.
        </Step>
        <Step n={2}>
          Choisis le moment qui déclenche la notif (voir les idées plus bas).
        </Step>
        <Step n={3}>
          Coche <b>Exécuter immédiatement</b> et décoche <b>M’avertir lors de l’exécution</b>, sinon l’iPhone te demandera à chaque fois.
        </Step>
        <Step n={4}>
          Touche <b>Suivant</b> et choisis ton raccourci (ex. « Pause Zen »). C’est prêt 🌿
        </Step>
      </Part>

      <section class="stack" style={{ gap: '8px' }}>
        <span class="label">Idées de moments</span>
        <div class="card flat">
          <Idea icon="home" title="Arrivée" text="En arrivant chez toi → Pause respiration" />
          <Idea icon="smile" title="App" text="Quand tu ouvres Instagram ou TikTok → une citation Psychologie" />
          <Idea icon="moon" title="Concentration" text="Quand le mode Sommeil s’active → Pensée du soir" />
          <Idea icon="briefcase" title="Départ" text="En quittant le travail → Mon exo du jour" />
          <Idea icon="sun" title="Alarme" text="Quand tu arrêtes ton réveil → Coup de boost" />
        </div>
      </section>

      <Tip>
        Le nom des boutons peut varier un peu selon ta version d’iOS. En cas de doute, l’action à chercher est toujours « Obtenir le contenu de l’URL ».
      </Tip>
    </main>
  );
}

function Part({ n, title, children }: { n: number; title: string; children: ComponentChildren }) {
  return (
    <section class="stack" style={{ gap: '10px' }}>
      <h2 class="h2">
        <span style={{ color: 'var(--green)' }}>{n}.</span> {title}
      </h2>
      <div class="card stack" style={{ gap: '16px' }}>
        {children}
      </div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: ComponentChildren }) {
  return (
    <div class="row" style={{ alignItems: 'flex-start', gap: '12px' }}>
      <span
        style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--green)', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        {n}
      </span>
      <div class="grow step-body">{children}</div>
    </div>
  );
}

function Tip({ children }: { children: ComponentChildren }) {
  return (
    <div class="row" style={{ alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--muted-2)', lineHeight: 1.45, padding: '0 4px' }}>
      <Icon name="star" size={16} color="#7A4E20" />
      <span>{children}</span>
    </div>
  );
}

function Idea({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div class="list-row" style={{ alignItems: 'center', padding: '10px 0' }}>
      <span class="k" style={{ alignItems: 'flex-start' }}>
        <Icon name={icon} size={18} color="var(--green)" />
        <span class="stack" style={{ gap: '1px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px' }}>{title}</span>
          <span style={{ fontSize: '13px', color: 'var(--muted-2)' }}>{text}</span>
        </span>
      </span>
    </div>
  );
}
