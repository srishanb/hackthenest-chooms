/** Small DOM helpers shared by menus: semantic buttons and keyboard focus containment. */
export function menuButton(text: string, action: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = text;
  button.addEventListener('click', action);
  return button;
}
export function trapMenuFocus(panel: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab' || panel.hidden) return;
  const controls = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')].filter((control) => !control.hidden && control.getClientRects().length > 0);
  const first = controls[0], last = controls.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
