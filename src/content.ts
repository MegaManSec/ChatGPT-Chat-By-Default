const TOGGLE = '[role="group"][aria-label="Composer mode"]';
const TOGGLE_FALLBACK = '[role="group"]:has(> button[aria-pressed][class*="home-mode-toggle"])';
const CHAT_LABEL = 'Chat';
const NEW_CHAT = '[data-testid="create-new-chat-button"], a[href="/"]';
const USER_CHOICE_WINDOW_MS = 1500;
const MAX_CLICKS = 3;
const CLICK_WINDOW_MS = 10_000;

let path = location.pathname;
let group: Element | null = null;
let chatWasPressed = false;
let keepWork = false;
let gaveUp = false;
let clicks: number[] = [];
let lastInputAt = Number.NEGATIVE_INFINITY;
let lastInputWasNewChat = false;

function findToggle(): { group: Element; chat: HTMLButtonElement } | null {
  const found = document.querySelector(TOGGLE) ?? document.querySelector(TOGGLE_FALLBACK);
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
  if (path.includes('/c/')) {
    return;
  }

  const toggle = findToggle();
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
  if (
    chatWasPressed &&
    !lastInputWasNewChat &&
    performance.now() - lastInputAt < USER_CHOICE_WINDOW_MS
  ) {
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

function isNewChatShortcut(event: Event): boolean {
  return (
    event instanceof KeyboardEvent &&
    (event.metaKey || event.ctrlKey) &&
    event.shiftKey &&
    event.key.toLowerCase() === 'o'
  );
}

function noteUserInput(event: Event): void {
  if (!event.isTrusted || !(event.target instanceof Element)) {
    return;
  }
  const newChat = isNewChatShortcut(event) || event.target.closest(NEW_CHAT) !== null;
  if (!newChat && event.target.closest('input, textarea, [contenteditable="true"]')) {
    return;
  }
  lastInputAt = performance.now();
  lastInputWasNewChat = newChat;
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
