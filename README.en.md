<p align="center">
  <img src="static/icons/logo.svg" width="96" height="96" alt="Klarsyn logo">
</p>

<h1 align="center">Klarsyn</h1>

<p align="center">
  <strong>AI-free search in Chrome, Edge and Firefox</strong><br>
  Hides AI answers and blocks AI chat on search engines. Everything runs locally.
</p>

<p align="center">
  <a href="README.md">Dansk</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="#limitations">Limitations</a>
</p>

---

## What does Klarsyn do?

Klarsyn ("clear sight" in Danish) is a browser extension for schools and anyone who wants search without AI.
It does two things that are kept strictly separate:

| Feature | What happens | Example |
|---|---|---|
| **AI answer filter** | AI boxes in the search results are hidden. Normal results stay. | Google AI Overviews |
| **AI chat blocking** | The whole page is covered by a block screen with a button to normal search. | Google AI Mode, Bing Copilot Search, Duck.ai, Ecosia AI Chat, Yahoo Scout |

Supported search engines: **Google, Bing, DuckDuckGo, Ecosia and Yahoo**.
An admin can also block AI chat services and AI agents (for example ChatGPT, Gemini, Claude, Perplexity, Manus, Genspark, Character.AI and Poe, more than 30 domains in total). This is off by default.

**Your own blocked sites:** an admin can enter any domain (for example a new AI site Klarsyn does not know yet). These are blocked by the browser itself through `declarativeNetRequest`, so it works on any site without extra website access. Users see the browser's own "blocked by an extension" page instead of Klarsyn's block screen.

Extra options:

- **Google "Web" view** (`udm=14`): the most reliable way to avoid AI Overviews on Google, but it also removes images and other boxes. Off by default.
- **noai.duckduckgo.com**: DuckDuckGo's own AI-free version. On by default.
- **Admin PIN**: stops others from changing settings or turning Klarsyn off.
- **Danish and English**, **light and dark theme**.

## Limitations

> [!IMPORTANT]
> **An extension cannot stop itself from being turned off.** A student with access to
> `chrome://extensions` can disable it. Real enforcement requires central policy
> (Intune, Group Policy or Google Workspace) that force-installs the extension.

> [!IMPORTANT]
> **An extension cannot turn off the browser's built-in AI**, such as Gemini in Chrome, Copilot in Edge
> or the AI chatbot in Firefox. That requires enterprise policies, handled by the policy generator,
> which is the next part of this project.

- **Search engines change their pages often.** Rules marked "best guess" below have not yet been confirmed against the live sites. Please send a screenshot if an AI box shows up again.
- **"Load unpacked" does not auto-update.** See [Distribution](#distribution).
- **No data leaves the browser.** Klarsyn makes no network requests. Settings live in the browser's own `storage.sync`. The redirects (Google Web view and noai.duckduckgo.com) are ordinary navigation to the search engine the user is already visiting.

## Installation (testing)

You need [Node.js 22 or newer](https://nodejs.org/). Open PowerShell in the project folder:

```powershell
npm install
npm run build
```

This creates `build\` with two subfolders:

| Browser | Folder | How to load |
|---|---|---|
| Chrome | `build\chromium` | `chrome://extensions` → turn on **Developer mode** → **Load unpacked** |
| Edge | `build\chromium` | `edge://extensions` → turn on **Developer mode** → **Load unpacked** |
| Firefox | `build\firefox` | `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick `build\firefox\manifest.json` (or `release\klarsyn-1.1.0-firefox.zip`) |

Requires Chrome 120+, Edge 120+ or Firefox 140+. Each folder contains a `LOAD-THIS-FOLDER.txt` with the same instructions.
Firefox removes temporary add-ons when the browser closes. **For students and exams:** see [Klarsyn permanently in Firefox](docs/FIREFOX-PERMANENT.md#english-summary) (signing by Mozilla and force-install, so students cannot remove it).

> [!WARNING]
> If Firefox shows **"background.service_worker is currently disabled"**, you picked a file in the wrong folder.
> Firefox always loads `manifest.json` in the folder you point to. Picking a file in `manifests\` or `build\chromium\` gives Firefox the Chrome manifest. Pick `build\firefox\manifest.json`.

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Compiles TypeScript and builds `build\chromium` and `build\firefox` |
| `npm test` | Runs all tests (Node's built-in `node:test`) |
| `npm run typecheck` | Type-checks without building |
| `npm run validate` | Validates the manifests and the contents of `build\` |
| `npm run check` | All of the above in order (same as CI) |
| `npm run package` | Builds and creates zip files in `release\` (including a source zip for Mozilla) |
| `npm run sign:firefox` | Has Mozilla sign the Firefox build (unlisted). See [docs/FIREFOX-PERMANENT.md](docs/FIREFOX-PERMANENT.md#english-summary) |

## Central management (storage.managed)

Klarsyn reads settings from the browser's managed storage. When set centrally, users cannot change them.

| Key | Type | Meaning |
|---|---|---|
| `enabled` | boolean | Klarsyn on/off |
| `lockSettings` | boolean | Lock all settings in the extension |
| `language` | `"da"` / `"en"` | Language |
| `googleForceWeb` | boolean | Google Web view (`udm=14`) |
| `ddgUseNoAi` | boolean | Use noai.duckduckgo.com |
| `categories` | object | For example `{"google.answers": true, "general.chat": true}` |
| `customBlockedDomains` | list of strings | Extra domains to block, for example `["manus.im"]`. Added to the user's own list and cannot be removed locally |

Categories: `google.answers`, `google.chat`, `bing.answers`, `bing.chat`, `duckduckgo.answers`, `duckduckgo.chat`, `ecosia.answers`, `ecosia.chat`, `yahoo.answers`, `yahoo.chat`, `general.chat`.

**Firefox** (`policies.json`, format confirmed from Mozilla):

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "klarsyn@klarsyn.extension": {
          "enabled": true,
          "lockSettings": true,
          "categories": { "general.chat": true },
          "customBlockedDomains": ["example-ai.com"]
        }
      }
    }
  }
}
```

**Chrome and Edge** use the same keys through their "3rdparty" extension policy. The schema is in `build\chromium\managed_schema.json` and is generated from the rules. Exact registry keys and Intune profiles will come with the policy generator, after being confirmed against Google's and Microsoft's documentation.

Always check the result at `chrome://policy`, `edge://policy` or `about:policies`.

## Distribution

"Load unpacked" is for testing only. For real rollout:

- **Chrome and Edge:** publish on the Chrome Web Store as **Unlisted** (only people with the link can find it). Edge can install extensions from the Chrome Web Store. Then force-install through policy so students cannot remove it.
- **Firefox:** have the package signed by Mozilla as **unlisted** and force-install it through `policies.json`. Steps, script and example: [docs/FIREFOX-PERMANENT.md](docs/FIREFOX-PERMANENT.md#english-summary).
- Updates arrive automatically through the Web Store, or through an `update_url` for the self-hosted Firefox package.

## Rules per search engine

| Search engine | AI chat (blocked) | Source | AI answers (hidden) |
|---|---|---|---|
| Google | `/search?udm=50` (AI Mode) | Confirmed | Heading "AI Overview" and translations. Best guess |
| Bing | `bing.com/copilotsearch`, `copilot.microsoft.com` | Confirmed | Copilot boxes. Best guess |
| Bing | `bing.com/chat` | Best guess | |
| DuckDuckGo | `duck.ai` | Confirmed | noai.duckduckgo.com (confirmed) + heading "Search Assist". Best guess |
| DuckDuckGo | `?ia=chat`, `/chat` | Best guess | |
| Ecosia | `/ai-search` | Confirmed | Heading "AI Overview". Best guess |
| Yahoo | `scout.yahoo.com` | Confirmed | Heading "Yahoo Scout". Best guess |

AI boxes are found by their heading. Klarsyn hides the largest surrounding box that does **not** contain normal search results, so a wrong guess never removes the results themselves.

## Project layout

```
src/
  shared/      pure logic (matching, rules, policy, i18n, PIN) + storage
  content/     content script and block screen
  background/  migration and central configuration
  ui/          popup and settings
static/        HTML, CSS and icons
manifests/     manifest.json (Chrome/Edge) and manifest.firefox.json
scripts/       build, validation, packaging and signing (windows/: Firefox install script)
docs/          guides and example policy
test/          tests (never included in build/)
```

No bundler: only `tsc`. Each file is a plain script in an IIFE and shares data through the global `KS` object.

## License

MIT. See [LICENSE](LICENSE).
