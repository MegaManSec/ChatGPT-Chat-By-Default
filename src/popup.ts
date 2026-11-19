declare const browser: {
  permissions: { contains(permissions: { origins: string[] }): Promise<boolean> };
  tabs: { create(properties: { url: string }): Promise<unknown> };
};

const SITE = 'https://chatgpt.com/';

async function showStatus(): Promise<void> {
  const status = document.getElementById('status');
  if (!status) {
    return;
  }
  try {
    const allowed = await browser.permissions.contains({ origins: [`${SITE}*`] });
    status.textContent = allowed
      ? 'Allowed on chatgpt.com. Nothing else to set up.'
      : "Not allowed on chatgpt.com yet. Allow it in Safari's extension settings, then reload the page.";
  } catch {
    status.textContent = 'It only acts on chatgpt.com; on other sites the button stays dimmed.';
  }
}

document.getElementById('open')?.addEventListener('click', () => {
  void browser.tabs.create({ url: SITE }).then(() => window.close());
});

void showStatus();
