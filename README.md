<p align="center">
  <img src="static/icons/logo.svg" width="96" height="96" alt="Klarsyn logo">
</p>

<h1 align="center">Klarsyn</h1>

<p align="center">
  <strong>AI-fri søgning i Chrome, Edge og Firefox</strong><br>
  Skjuler AI-svar og blokerer AI-chat på søgemaskiner. Alt kører lokalt.
</p>

<p align="center">
  <a href="README.en.md">English</a> ·
  <a href="CHANGELOG.md">Ændringslog</a> ·
  <a href="#begrænsninger">Begrænsninger</a>
</p>

---

## Hvad gør Klarsyn?

Klarsyn er en browserudvidelse til skoler og andre, der vil have søgning uden AI.
Den gør to ting, som holdes helt adskilt:

| Funktion | Hvad sker der | Eksempel |
|---|---|---|
| **AI-svar-filter** | AI-bokse i søgeresultaterne skjules. Almindelige resultater bliver stående. | Googles AI-oversigt |
| **AI-chat-blokering** | Hele siden spærres med en blokeringsskærm og en knap til almindelig søgning. | Google AI Mode, Bing Copilot Search, Duck.ai, Ecosia AI-chat, Yahoo Scout |

Understøttede søgemaskiner: **Google, Bing, DuckDuckGo, Ecosia og Yahoo**.
Admin kan også slå blokering af AI-chattjenester og AI-agenter til (fx ChatGPT, Gemini, Claude, Perplexity, Manus, Genspark, Character.AI og Poe, i alt over 30 domæner). Den er slået fra som standard.

**Egne blokerede sider:** admin kan skrive vilkårlige domæner ind (fx en ny AI-side, Klarsyn ikke kender endnu). De blokeres af browseren selv via `declarativeNetRequest`, så det virker på alle sider uden ekstra adgang til websider. Brugeren ser browserens egen side "blokeret af en udvidelse" i stedet for Klarsyns spærreskærm.

Ekstra valg:

- **Googles "Web"-visning** (`udm=14`): den sikreste måde at undgå AI-oversigter hos Google, men fjerner også billeder og andre bokse. Fra som standard.
- **noai.duckduckgo.com**: DuckDuckGos egen AI-fri udgave. Til som standard.
- **Admin-PIN**: forhindrer, at andre ændrer indstillinger eller slukker for Klarsyn.
- **Dansk og engelsk**, **lyst og mørkt tema**.

## Begrænsninger

> [!IMPORTANT]
> **En udvidelse kan ikke forhindre, at den selv bliver slået fra.** En elev med adgang til
> `chrome://extensions` kan deaktivere den. Reel håndhævelse kræver central politik
> (Intune, Group Policy eller Google Workspace), som tvangsinstallerer udvidelsen.

> [!IMPORTANT]
> **En udvidelse kan ikke slå browserens indbyggede AI fra**, fx Gemini i Chrome, Copilot i Edge
> eller AI-chatbotten i Firefox. Det kræver enterprise-politikker. Det håndteres af
> politik-generatoren, som er næste del af projektet.

- **Søgemaskinerne ændrer ofte deres sider.** Regler markeret "bedste bud" nedenfor er ikke bekræftet mod de rigtige sider endnu. Send et skærmbillede, hvis en AI-boks dukker op igen.
- **"Indlæs upakket" opdaterer ikke automatisk.** Se [Distribution](#distribution).
- **Ingen data forlader browseren.** Klarsyn laver ingen netværkskald. Indstillinger gemmes i browserens egen `storage.sync`. Omdirigeringerne (Google Web-visning og noai.duckduckgo.com) er almindelig navigation til søgemaskinen, som brugeren alligevel besøger.

## Installation (test)

Du skal bruge [Node.js 22 eller nyere](https://nodejs.org/). Åbn PowerShell i projektmappen:

```powershell
npm install
npm run build
```

Det giver mappen `build\` med to undermapper:

| Browser | Mappe | Sådan indlæses den |
|---|---|---|
| Chrome | `build\chromium` | `chrome://extensions` → slå **Udviklertilstand** til → **Indlæs upakket** |
| Edge | `build\chromium` | `edge://extensions` → slå **Udviklertilstand** til → **Indlæs upakket** |
| Firefox | `build\firefox` | `about:debugging#/runtime/this-firefox` → **Indlæs midlertidig tilføjelse** → vælg `build\firefox\manifest.json` (eller `release\klarsyn-1.1.0-firefox.zip`) |

Kræver Chrome 120+, Edge 120+ eller Firefox 140+. Hver mappe har en `LOAD-THIS-FOLDER.txt` med samme vejledning.
Firefox fjerner midlertidige tilføjelser, når browseren lukkes. **Til elever og prøver:** se [Klarsyn permanent i Firefox](docs/FIREFOX-PERMANENT.md) (signering hos Mozilla og tvangsinstallation, så eleven ikke kan fjerne den).

> [!WARNING]
> Får du fejlen **"background.service_worker is currently disabled"** i Firefox, har du valgt en fil i den forkerte mappe.
> Firefox indlæser altid `manifest.json` i den mappe, du peger på. Vælger du en fil i `manifests\` eller `build\chromium\`, får Firefox Chrome-manifestet. Vælg `build\firefox\manifest.json`.

## Kommandoer

| Kommando | Hvad den gør |
|---|---|
| `npm run build` | Kompilerer TypeScript og bygger `build\chromium` og `build\firefox` |
| `npm test` | Kører alle tests (Node's indbyggede `node:test`) |
| `npm run typecheck` | Tjekker typer uden at bygge |
| `npm run validate` | Validerer manifester og indholdet af `build\` |
| `npm run check` | Alt ovenfor i rækkefølge (det samme som CI kører) |
| `npm run package` | Bygger og laver zip-filer i `release\` (inkl. kildekode-zip til Mozilla) |
| `npm run sign:firefox` | Får Firefox-udgaven signeret af Mozilla (unlisted). Se [docs/FIREFOX-PERMANENT.md](docs/FIREFOX-PERMANENT.md) |

## Central styring (storage.managed)

Klarsyn læser indstillinger fra browserens "managed storage". Når de er sat centralt, kan brugeren ikke ændre dem.

| Nøgle | Type | Betydning |
|---|---|---|
| `enabled` | boolean | Klarsyn til/fra |
| `lockSettings` | boolean | Lås alle indstillinger i udvidelsen |
| `language` | `"da"` / `"en"` | Sprog |
| `googleForceWeb` | boolean | Googles Web-visning (`udm=14`) |
| `ddgUseNoAi` | boolean | Brug noai.duckduckgo.com |
| `categories` | objekt | Fx `{"google.answers": true, "general.chat": true}` |
| `customBlockedDomains` | liste af tekst | Ekstra domæner der blokeres, fx `["manus.im"]`. Lægges oven i brugerens egne og kan ikke fjernes lokalt |

Kategorier: `google.answers`, `google.chat`, `bing.answers`, `bing.chat`, `duckduckgo.answers`, `duckduckgo.chat`, `ecosia.answers`, `ecosia.chat`, `yahoo.answers`, `yahoo.chat`, `general.chat`.

**Firefox** (`policies.json`, bekræftet format fra Mozilla):

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "klarsyn@klarsyn.extension": {
          "enabled": true,
          "lockSettings": true,
          "categories": { "general.chat": true },
          "customBlockedDomains": ["eksempel-ai.dk"]
        }
      }
    }
  }
}
```

**Chrome og Edge** bruger samme nøgler via deres "3rdparty"-politik for udvidelser. Skemaet ligger i `build\chromium\managed_schema.json` og genereres automatisk ud fra reglerne. De præcise registreringsnøgler og Intune-profiler kommer med politik-generatoren, hvor de bliver bekræftet mod Googles og Microsofts dokumentation først.

Kontrollér altid resultatet på `chrome://policy`, `edge://policy` eller `about:policies`.

## Distribution

"Indlæs upakket" er kun til test. Til rigtig udrulning:

- **Chrome og Edge:** udgiv på Chrome Web Store som **Unlisted** (kun dem med linket kan finde den). Edge kan installere udvidelser fra Chrome Web Store. Tvangsinstallér derefter via politik, så eleverne ikke kan fjerne den.
- **Firefox:** få pakken signeret af Mozilla som **unlisted** og tvangsinstallér den via `policies.json`. Trin for trin, script og eksempel: [docs/FIREFOX-PERMANENT.md](docs/FIREFOX-PERMANENT.md).
- Opdateringer kommer automatisk via Web Store eller via en `update_url` for den selv-hostede Firefox-pakke.

## Regler pr. søgemaskine

| Søgemaskine | AI-chat (blokeres) | Kilde | AI-svar (skjules) |
|---|---|---|---|
| Google | `/search?udm=50` (AI Mode) | Bekræftet | Overskrift "AI-oversigt" / "AI Overview" m.fl. Bedste bud |
| Bing | `bing.com/copilotsearch`, `copilot.microsoft.com` | Bekræftet | Copilot-bokse. Bedste bud |
| Bing | `bing.com/chat` | Bedste bud | |
| DuckDuckGo | `duck.ai` | Bekræftet | noai.duckduckgo.com (bekræftet) + overskrift "Search Assist". Bedste bud |
| DuckDuckGo | `?ia=chat`, `/chat` | Bedste bud | |
| Ecosia | `/ai-search` | Bekræftet | Overskrift "AI Overview". Bedste bud |
| Yahoo | `scout.yahoo.com` | Bekræftet | Overskrift "Yahoo Scout". Bedste bud |

AI-bokse findes ud fra deres overskrift. Klarsyn skjuler den største omkringliggende boks, som **ikke** indeholder almindelige søgeresultater, så et forkert gæt aldrig fjerner selve resultaterne.

## Projektstruktur

```
src/
  shared/      ren logik (matching, regler, politik, i18n, PIN) + lagring
  content/     indholdsscript og spærreskærm
  background/  migrering og central konfiguration
  ui/          pop-op og indstillinger
static/        HTML, CSS og ikoner
manifests/     manifest.json (Chrome/Edge) og manifest.firefox.json
scripts/       build, validering, pakning og signering (windows/: installationsscript til Firefox)
docs/          vejledninger og eksempelpolitik
test/          tests (kommer aldrig med i build/)
```

Ingen bundler: kun `tsc`. Hver fil er et almindeligt script i en IIFE og deler data via det globale objekt `KS`.

## Læg projektet på GitHub (PowerShell)

Første gang (erstat `DIT-NAVN`):

```powershell
git init
git add .
git commit -m "Klarsyn 1.0.0"
git branch -M main
git remote add origin https://github.com/DIT-NAVN/klarsyn.git
git push -u origin main
```

Ved en ny version: pak den nye zip ud **oven i** den eksisterende mappe (slet aldrig mappen `.git`), og kør:

```powershell
git add .
git commit -m "Klarsyn 1.0.1"
git push
```

`ADMIN.md`, `node_modules\`, `dist\`, `build\` og `release\` holdes uden for Git via `.gitignore`.

## Licens

MIT. Se [LICENSE](LICENSE).
