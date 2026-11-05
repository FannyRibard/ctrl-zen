import { describe, expect, it } from 'vitest';
import { NOTIF_BODY_BUDGET, composeBody, quoteBudget } from '../shared/meta';

describe('mise en forme des notifs avec citation', () => {
  const msg = 'C’est le moment de ton exercice. Cinq minutes suffisent.';

  it('met la citation juste sous le message, sans ligne vide et sans auteur', () => {
    expect(composeBody(msg, { text: 'Connais-toi toi-même.', author: 'Socrate' } as { text: string })).toBe(
      `${msg}\n« Connais-toi toi-même. »`,
    );
    expect(composeBody('', { text: 'Une pensée n’est pas un fait.' })).toBe('« Une pensée n’est pas un fait. »');
  });

  it('une citation qui respecte la place restante donne une notif dans le budget', () => {
    const fitting = { text: 'x'.repeat(quoteBudget(msg)) };
    expect(composeBody(msg, fitting).length).toBeLessThanOrEqual(NOTIF_BODY_BUDGET);
  });
});
