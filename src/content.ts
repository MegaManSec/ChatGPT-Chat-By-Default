const TOGGLE = '[role="group"][aria-label="Composer mode"]';
const TOGGLE_FALLBACK = '[role="group"]:has(> button[aria-pressed][class*="home-mode-toggle"])';
const CHAT_LABEL = 'Chat';
const MAX_CLICKS = 10;
const CLICK_WINDOW_MS = 10_000;

let path = location.pathname;
let group: Element | null = null;
let keepWork = false;
let gaveUp = false;
let clicks: number[] = [];

function findGroup(from: Document | Element): Element | null {
  if (from instanceof Element) {
    return from.closest(TOGGLE) ?? from.closest(TOGGLE_FALLBACK);
  }
  return from.querySelector(TOGGLE) ?? from.querySelector(TOGGLE_FALLBACK);
}

function chatButton(found: Element): HTMLButtonElement | null {
  const buttons = Array.from(found.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'));
  if (buttons.length !== 2) {
    return null;
  }
  return buttons.find((b) => b.textContent?.trim() === CHAT_LABEL) ?? buttons[0] ?? null;
}

function check(): void {
  if (location.pathname !== path) {
    path = location.pathname;
    keepWork = false;
    gaveUp = false;
    clicks = [];
  }
  const found = path.includes('/c/') ? null : findGroup(document);
  const chat = found && chatButton(found);
  if (!found || !chat) {
    return;
  }
  if (found !== group) {
    group = found;
    keepWork = false;
  }
  if (chat.getAttribute('aria-pressed') === 'true' || keepWork || gaveUp || chat.disabled) {
    return;
  }

  const now = performance.now();
  clicks = clicks.filter((t) => now - t < CLICK_WINDOW_MS);
  if (clicks.length >= MAX_CLICKS) {
    gaveUp = true;
    return;
  }
  clicks.push(now);
  chat.click();
}

function noteUserChoice(event: Event): void {
  if (!event.isTrusted || !(event.target instanceof Element)) {
    return;
  }
  const button = event.target.closest('button[aria-pressed]');
  const found = button && findGroup(button);
  const chat = found && chatButton(found);
  if (!button || !chat) {
    return;
  }
  keepWork = button !== chat;
}

document.addEventListener('click', noteUserChoice, true);

new MutationObserver(check).observe(document, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['aria-pressed', 'disabled'],
});
check();
