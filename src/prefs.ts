// Préférences propres à cet appareil (stockées dans le navigateur).
const NAME = 'ctrlzen.name';

export function getName(): string {
  try {
    return localStorage.getItem(NAME) || '';
  } catch {
    return '';
  }
}

export function setName(v: string) {
  try {
    localStorage.setItem(NAME, v.trim());
  } catch {
    /* ignoré */
  }
}
