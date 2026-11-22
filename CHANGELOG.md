# Ændringslog / Changelog

Formatet følger [Keep a Changelog](https://keepachangelog.com/da/1.1.0/), og versionsnumre følger [Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-11-19

### Tilføjet
- **Permanent installation i Firefox** til elev- og prøve-pc'er: vejledningen `docs/FIREFOX-PERMANENT.md` (signering hos Mozilla som unlisted, tvangsinstallation og kontrol).
- `npm run sign:firefox`: signerer Firefox-udgaven via Mozillas API med `web-ext` og uploader kildekoden samtidig.
- `scripts/windows/Install-KlarsynFirefox.ps1`: kopierer den signerede `.xpi` og skriver `policies.json` med `force_installed`, så eleven ikke kan fjerne eller slå Klarsyn fra. En eksisterende `policies.json` udvides, og der tages sikkerhedskopi.
- `docs/firefox-policies.example.json` til Intune og Group Policy.
- `npm run package` laver nu også `klarsyn-<version>-source.zip` til Mozillas gennemgang.

### Testet
- 49 enhedstests i Node, inkl. at udvidelses-id'et er det samme i Firefox-manifestet, scriptet og eksempelpolitikken.
- `web-ext sign` er installeret og kaldes korrekt, men **er ikke kørt mod Mozilla** (kræver jeres API-nøgler).
- **PowerShell-scriptet er ikke kørt på Windows.** Prøv det på én pc før en prøve.

## [1.1.0] - 2026-11-19

### Tilføjet
- **Egne blokerede sider:** admin kan skrive domæner ind i indstillingerne. Browseren blokerer dem selv via `declarativeNetRequest`, også sider Klarsyn ikke kender. Kan også sættes centralt med `customBlockedDomains`.
- Flere AI-tjenester under "AI-chattjenester": Manus (`manus.im`), Genspark (`genspark.ai`), Character.AI, Poe, DeepAI og Janitor AI (bekræftet), samt Qwen, Kimi, You.com, Phind, Pi, Monica, Z.ai, LMArena, Felo, NotebookLM, Google AI Studio og Hugging Face Chat (bedste bud).
- Ny tilladelse: `declarativeNetRequest` (Chrome viser "Bloker indhold på alle sider" ved installation).
- `manifests/README.txt`, der forklarer, at udvidelsen ikke må indlæses derfra.

### Rettet
- Firefox-fejlen "background.service_worker is currently disabled" opstod, når man valgte en fil uden for `build\firefox`. Firefox indlæser altid `manifest.json` i den valgte mappe. Vejledningerne siger det nu tydeligt.

### Testet
- 47 enhedstests i Node.
- Chrome (headless) mod lokale testsider: 11 af 11 nye tjek bestod. Det gælder Manus og Genspark, egne domæner inkl. underdomæner, at andre domæner ikke påvirkes, og at en fjernet blokering virker igen. De 24 tjek fra 1.0.0 gav samme resultat som før (23 af 24).
- Firefox-pakken: 0 fejl i `web-ext lint`. **Stadig ikke kørt i Firefox eller Edge.**

### Migrering
- Politik-skema version 2. Eksisterende brugere får en tom liste med egne sider, og alle tidligere valg bevares (dækket af test).

## [1.0.0] - 2026-11-18

### Tilføjet
- Første udgave af Klarsyn med nyt navn og logo.
- AI-svar-filter for Google, Bing, DuckDuckGo, Ecosia og Yahoo. Skjuler kun bokse uden almindelige resultater.
- AI-chat-blokering med spærreskærm (`<dialog>` + `showModal()`, shadow DOM, Escape blokeret) for Google AI Mode, Bing Copilot Search, Duck.ai, Ecosias `/ai-search` og Yahoo Scout.
- Valgfri blokering af AI-chattjenester (ChatGPT, Gemini, Claude, Perplexity, Mistral, DeepSeek, Meta AI, Grok). Fra som standard.
- Googles Web-visning (`udm=14`) og noai.duckduckgo.com som valg.
- Admin-PIN (PBKDF2-SHA256) med midlertidig spærring efter 5 forkerte forsøg.
- Central styring via `storage.managed` (Chrome/Edge 3rdparty-politik, Firefox `policies.json`).
- Migrering, så nye kategorier også kommer med hos eksisterende brugere.
- Dansk og engelsk UI, lyst og mørkt tema.
- Kræver Chrome 120+, Edge 120+ eller Firefox 140+.
- Tests med `node:test`, GitHub Actions CI, manifest-validering og zip-pakning.

### Testet
- 39 enhedstests i Node.
- 24 ende-til-ende-tjek i Chrome 153 (headless) mod lokale testsider, der efterligner søgemaskinerne. 23 bestod. Ikke bekræftet: at indstillingssiden åbner ved første installation.
- Firefox-pakken giver 0 fejl i Mozillas `web-ext lint` (1 advarsel, som kun gælder Firefox til Android).
- **Ikke testet endnu:** Firefox, Edge og de rigtige søgemaskiners sider.
