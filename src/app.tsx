import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { AppState } from '../shared/types';
import { ApiError, api, getKey, loadState, setKey } from './api';
import { pushStatus, syncSubscription } from './push';
import { AppCtx, type Ctx, type Route } from './ui';
import { Login } from './screens/Login';
import { Home } from './screens/Home';
import { Editor } from './screens/Editor';
import { Categories } from './screens/Category';
import { Quotes } from './screens/Quotes';
import { Templates } from './screens/Templates';
import { Settings } from './screens/Settings';
import { Reminders } from './screens/Reminders';
import { History } from './screens/History';
import { Guide } from './screens/Guide';

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [needLogin, setNeedLogin] = useState(!getKey());
  const [loadError, setLoadError] = useState('');
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [toastMsg, setToastMsg] = useState('');
  const [pushOn, setPushOn] = useState(false);
  const toastTimer = useRef<number>();

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2600);
  }, []);

  const reload = useCallback(async () => {
    try {
      setState(await loadState());
      setLoadError('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setKey('');
        setNeedLogin(true);
      } else setLoadError((e as Error).message);
    }
  }, []);

  const refreshPush = useCallback(async () => setPushOn((await pushStatus()) === 'on'), []);

  const afterLogin = useCallback(async (s: AppState) => {
    setState(s);
    setNeedLogin(false);
    refreshPush();
    syncSubscription();
    // Le fuseau du téléphone sert à calculer les heures d'envoi.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && s.settings.timezone === 'Europe/Paris' && tz !== s.settings.timezone && !localStorage.getItem('ctrlzen.tzAsked')) {
      localStorage.setItem('ctrlzen.tzAsked', '1');
      await api('settings', 'PUT', { timezone: tz }).catch(() => {});
      setState(await loadState());
    }
  }, []);

  useEffect(() => {
    if (!needLogin) loadState().then(afterLogin).catch(() => reload());
  }, []);

  // Recharger quand on revient sur l'app (les « prochaines dates » ont pu changer).
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && !needLogin && reload();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [needLogin]);

  const go = useCallback((r: Route) => {
    setStack((s) => (['home', 'templates', 'quotes', 'settings'].includes(r.name) ? [r] : [...s, r]));
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ name: 'home' }]));
    window.scrollTo(0, 0);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<unknown>, okMsg?: string) => {
      try {
        await fn();
        await reload();
        if (okMsg) toast(okMsg);
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setKey('');
          setNeedLogin(true);
        }
        toast((e as Error).message);
        return false;
      }
    },
    [reload, toast],
  );

  if (needLogin) return <Login onLogin={afterLogin} />;
  if (!state)
    return (
      <main class="login">
        <img src="/icons/icon-512.png" alt="" />
        {loadError ? (
          <>
            <span class="err">{loadError}</span>
            <button type="button" class="btn" onClick={reload}>
              Réessayer
            </button>
          </>
        ) : (
          <span class="sub">Chargement…</span>
        )}
      </main>
    );

  const ctx: Ctx = { state, reload, go, back, toast, run, pushOn, refreshPush };
  const route = stack[stack.length - 1];

  let screen;
  switch (route.name) {
    case 'editor':
      screen = <Editor key={`${route.mode}-${route.id ?? 'new'}-${route.templateId ?? ''}`} mode={route.mode} id={route.id} templateId={route.templateId} />;
      break;
    case 'categories':
    case 'category':
      screen = <Categories />;
      break;
    case 'quotes':
      screen = <Quotes />;
      break;
    case 'templates':
      screen = <Templates />;
      break;
    case 'settings':
      screen = <Settings />;
      break;
    case 'reminders':
      screen = <Reminders />;
      break;
    case 'history':
      screen = <History />;
      break;
    case 'guide':
      screen = <Guide />;
      break;
    default:
      screen = <Home />;
  }

  return (
    <AppCtx.Provider value={ctx}>
      {screen}
      {toastMsg && (
        <div class="toast" role="status">
          {toastMsg}
        </div>
      )}
    </AppCtx.Provider>
  );
}
