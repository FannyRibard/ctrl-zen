import { useState } from 'preact/hooks';
import type { AppState } from '../../shared/types';
import { loadState, setKey } from '../api';

export function Login({ onLogin }: { onLogin: (s: AppState) => void }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const s = await loadState(code.trim());
      setKey(code.trim());
      onLogin(s);
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="login">
      <img src="/icons/icon-512.png" alt="" />
      <div class="stack" style={{ gap: '6px', alignItems: 'center' }}>
        <h1 class="h1">Ctrl+Zen</h1>
        <span class="sub" style={{ fontSize: '15px' }}>404 : stress not found</span>
      </div>
      <form onSubmit={submit}>
        <label class="label" for="code" style={{ textAlign: 'left' }}>
          Ton code d’accès
        </label>
        <input
          id="code"
          class="input"
          style={{ background: '#fff', height: '52px', textAlign: 'center', fontSize: '18px' }}
          type="password"
          autoComplete="current-password"
          value={code}
          onInput={(e) => setCode(e.currentTarget.value)}
        />
        {err && <span class="err">{err}</span>}
        <button type="submit" class="btn" disabled={busy || !code.trim()}>
          {busy ? 'Connexion…' : 'Entrer'}
        </button>
      </form>
    </main>
  );
}
