const TOGGLE = '[role="group"][aria-label="Composer mode"]';
const TOGGLE_FALLBACK = '[role="group"]:has(> button[aria-pressed][class*="home-mode-toggle"])';
const CHAT_LABEL = 'Chat';
const USER_CHOICE_WINDOW_MS = 1500;
const MAX_CLICKS = 10;
const CLICK_WINDOW_MS = 10_000;

let path = location.pathname;
let group: Element | null = null;
let chatWasPressed = false;
let keepWork = false;
let gaveUp = false;
let clicks: number[] = [];
let lastToggleInputAt = Number.NEGATIVE_INFINITY;

function findGroup(from: Document | Element): Element | null {
  if (from instanceof Element) {
    return from.closest(TOGGLE) ?? from.closest(TOGGLE_FALLBACK);
  }
  return from.querySelector(TOGGLE) ?? from.querySelector(TOGGLE_FALLBACK);
}

function findToggle(): { group: Element; chat: HTMLButtonElement } | null {
  const found = findGroup(document);
  if (!found) {
    return null;
  }
  const buttons = Array.from(found.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'));
  if (buttons.length !== 2) {
    return null;
  }
  const chat = buttons.find((b) => b.textContent?.trim() === CHAT_LABEL) ?? buttons[0];
  return chat ? { group: found, chat } : null;
}

function check(): void {
  if (location.pathname !== path) {
    path = location.pathname;
    keepWork = false;
    gaveUp = false;
    clicks = [];
  }
  const toggle = path.includes('/c/') ? null : findToggle();
  if (!toggle) {
    return;
  }
  if (toggle.group !== group) {
    group = toggle.group;
    chatWasPressed = false;
    keepWork = false;
  }

  const { chat } = toggle;
  if (chat.getAttribute('aria-pressed') === 'true') {
    chatWasPressed = true;
    keepWork = false;
    return;
  }
  if (chatWasPressed && performance.now() - lastToggleInputAt < USER_CHOICE_WINDOW_MS) {
    keepWork = true;
  }
  chatWasPressed = false;
  if (keepWork || gaveUp || chat.disabled) {
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

function noteUserInput(event: Event): void {
  if (event.isTrusted && event.target instanceof Element && findGroup(event.target)) {
    lastToggleInputAt = performance.now();
  }
}

document.addEventListener('pointerdown', noteUserInput, true);
document.addEventListener('keydown', noteUserInput, true);

new MutationObserver(check).observe(document, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['aria-pressed', 'disabled'],
});
check();
