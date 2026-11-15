/** Menu-only credits drawn from AGENTS.md and CREDITS.md; no network or invented contributors. */
import { menuButton } from '../../menu-dom';
import { t } from '../../strings';

export function createCredits(onBack: () => void): HTMLElement {
  const panel = document.createElement('section'); panel.className = 'menu-panel launch-credits'; panel.hidden = true;
  panel.setAttribute('aria-label', t('start.credits'));
  const title = document.createElement('h2'); title.textContent = t('start.credits');
  const intro = document.createElement('p'); intro.textContent = t('credits.intro');
  const list = document.createElement('dl');
  for (const item of ['team', 'art', 'audio', 'technology', 'font'] as const) {
    const name = document.createElement('dt'); name.textContent = t(`credits.${item}.label`);
    const value = document.createElement('dd'); value.textContent = t(`credits.${item}.body`); list.append(name, value);
  }
  panel.append(title, intro, list, menuButton(t('menu.backToStart'), onBack));
  return panel;
}
