# Chat by Default

| Browser                                                                                                                                                                                                       | Install from                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| <img src="https://cdn.jsdelivr.net/gh/alrra/browser-logos@75.0.1/src/chrome/chrome_64x64.png" width="32" height="32" alt="Chrome">                                                                            | Chrome Web Store (coming soon)                                                                        |
| <a href="https://addons.mozilla.org/firefox/addon/chat-by-default/"><img src="https://cdn.jsdelivr.net/gh/alrra/browser-logos@75.0.1/src/firefox/firefox_64x64.png" width="32" height="32" alt="Firefox"></a> | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/chat-by-default/), for desktop and Android |
| <img src="https://cdn.jsdelivr.net/gh/alrra/browser-logos@75.0.1/src/safari/safari_64x64.png" width="32" height="32" alt="Safari">                                                                            | App Store, for macOS, iOS and iPadOS (coming soon)                                                    |

Every time I open chatgpt.com it lands on the Work tab, and I never want Work. This extension switches it back to Chat.

## What it does

- Waits for the Chat/Work toggle on the home page. The server sends it disabled and it only becomes clickable once the page has loaded, so the extension waits for that before clicking Chat.
- Does the same thing whenever the site flips back to Work, for example after New chat. Right after New chat the site switches back to Work a couple of times by itself, and the extension switches it back to Chat each time.
- Leaves Work alone if you switch to it yourself, until you go to another page or start a new chat. It knows it was you because you clicked the Work button yourself, with the mouse, a tap or the keyboard; the site switching on its own doesn't count.
- Stops trying on a page after ten clicks in ten seconds, so it can't end up fighting the site in a loop.
- Does nothing on conversation pages (`/c/...`), since they don't have the toggle.
- Finds the toggle by its English label. In other languages it falls back to matching the toggle's structure, which is less reliable.
- Only runs on `https://chatgpt.com/*`, asks for no other permissions and makes no network requests.

## Why the site does this

Which tab you get is decided by a server-side experiment and a recommendation cookie. If you pick Chat yourself, the site only remembers it for up to four hours, and on some accounts it ignores it completely, so every page load and every New chat lands on Work again. You can't fix that with cookies or local storage, so the extension just clicks the Chat button for you.

## Set it up in Safari

Safari keeps a new extension off until you turn it on, and then asks before letting it run on chatgpt.com.

**iOS and iPadOS**

1. Install Chat by Default from the App Store.
2. Go to Settings → Apps → Safari → Extensions → Chat by Default (on iOS 17, Settings → Safari → Extensions) and turn it on.
3. On the same screen, set chatgpt.com to Allow.
4. The app only shows these steps, so you can take it off your Home Screen: long-press its icon, then Remove App → Remove from Home Screen. Don't choose Delete App, which removes the extension too.

**macOS**

1. Install Chat by Default from the App Store, or download the notarized app from [Other downloads](#other-downloads).
2. Open the app once, then turn the extension on in Safari → Settings → Extensions.
3. Allow it on chatgpt.com under Safari → Settings → Websites → Chat by Default. "Allow for One Day" stops working the next day without telling you.

## Other downloads

Releases also have these files:

- `chat-by-default-firefox.xpi`, signed by Mozilla. Drag it into a Firefox window, or open `about:addons`, click the gear and choose Install Add-on From File. If a release only has `chat-by-default-firefox.unsigned.xpi`, Mozilla hadn't signed it yet. Only Firefox Developer Edition and Nightly install that, after you set `xpinstall.signatures.required` to `false` in `about:config`.
- `chat-by-default-chrome.zip`. Unzip it, open `chrome://extensions`, turn on Developer mode, click Load unpacked and pick the unzipped folder.
- `chat-by-default-macos.zip`, the macOS app, notarized by Apple. Unzip it, move the app to Applications, then follow the macOS steps above.

`gh attestation verify <file> --repo MegaManSec/chatgpt-chat-by-default` checks that a file was built by this repository's release workflow.

## Privacy

Chat by Default collects nothing and makes no network requests. See [PRIVACY.md](PRIVACY.md).

## Issues

Report problems in [Issues](../../issues).

## Changelog

See [Releases](../../releases).

## Development

Building, loading a local build and releasing are in [DEVELOPMENT.md](DEVELOPMENT.md).
