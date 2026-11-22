# Klarsyn permanent i Firefox (fx til prøver)

"Indlæs midlertidig tilføjelse" er kun til test. Firefox fjerner den, når browseren lukkes.
Til elever og prøver skal Klarsyn være:

1. **Signeret af Mozilla**: almindelig Firefox installerer kun signerede udvidelser.
2. **Tvangsinstalleret via politik** (`force_installed`): så kan eleven hverken fjerne eller slå den fra.

Signeringen er gratis. Med valget **unlisted** bliver Klarsyn ikke offentlig på addons.mozilla.org. I får bare en signeret `.xpi`-fil.

> [!NOTE]
> Firefox ESR, Developer Edition og Nightly kan slå signaturkravet fra (`xpinstall.signatures.required`).
> Det anbefales ikke på elev-pc'er. Brug en signeret fil.

---

## Del 1: Få en signeret .xpi (én gang pr. version)

Byg først pakkerne i PowerShell i projektmappen:

```powershell
npm install
npm run package
```

Det giver blandt andet:

- `release\klarsyn-<version>-firefox.zip`: selve udvidelsen
- `release\klarsyn-<version>-source.zip`: kildekoden (Mozilla kan bede om den, fordi TypeScript bliver oversat til JavaScript)

### Mulighed A: upload i browseren (nemmest)

1. Opret en konto, og log ind på <https://addons.mozilla.org/developers/>.
2. Vælg **Submit a New Add-on** (indsend en ny tilføjelse).
3. Vælg, at I selv distribuerer den (**On your own** / unlisted), og *ikke* at den skal være offentlig på siden.
4. Upload `release\klarsyn-<version>-firefox.zip`.
5. Bliver I spurgt, om koden er oversat eller minificeret, så svar **ja** og upload `release\klarsyn-<version>-source.zip`.
6. Signeringen sker normalt automatisk efter kort tid. Download den signerede `.xpi` fra versionssiden.

### Mulighed B: kommandolinje

1. Lav API-nøgler på <https://addons.mozilla.org/developers/addon/api/key/>.
2. I PowerShell:

```powershell
$env:WEB_EXT_API_KEY = "user:12345:67"
$env:WEB_EXT_API_SECRET = "din-hemmelige-noegle"
npm run sign:firefox
```

Den signerede `.xpi` lægges i `release\`. Nøglerne gemmes ingen steder. De gælder kun i det åbne PowerShell-vindue.

> [!IMPORTANT]
> - Hver signering kræver et **nyt versionsnummer**.
> - Udvidelses-id'et `klarsyn@klarsyn.extension` bliver knyttet til jeres Mozilla-konto ved første signering. Skift det ikke bagefter.

---

## Del 2: Tvangsinstallér på elevernes pc'er

### Én eller få pc'er: brug scriptet

Kopiér den signerede `.xpi` og `scripts\windows\Install-KlarsynFirefox.ps1` til pc'en. Åbn **PowerShell som administrator** i mappen, og kør:

```powershell
powershell -ExecutionPolicy Bypass -File .\Install-KlarsynFirefox.ps1 -Xpi ".\klarsyn-1.2.0.xpi" -BlockAiChatServices
```

Scriptet gør tre ting:

- Kopierer filen til `C:\ProgramData\Klarsyn\klarsyn.xpi`.
- Skriver `policies.json` i `C:\Program Files\Mozilla Firefox\distribution\`. En eksisterende fil bliver gemt som sikkerhedskopi først.
- Sætter Klarsyn til `force_installed` og låser indstillingerne.

Tilvalg:

| Tilvalg | Betydning |
|---|---|
| `-BlockAiChatServices` | Blokér ChatGPT, Gemini, Claude, Manus, Genspark m.fl. |
| `-BlockDomains "a.dk","b.com"` | Ekstra domæner, der blokeres |
| `-AllowSettingsChanges` | Lås ikke indstillingerne (admin-PIN gælder stadig) |
| `-FirefoxDir "D:\Firefox"` | Hvis Firefox ikke ligger det sædvanlige sted |
| `-Uninstall` | Fjern Klarsyn igen ved næste start |

Genstart Firefox bagefter.

> [!WARNING]
> Scriptet er skrevet og gennemgået, men **ikke kørt på Windows endnu**. Prøv det på én pc før en prøve.

### Mange pc'er: Intune eller Group Policy

Brug samme indhold som i [`firefox-policies.example.json`](firefox-policies.example.json) med Firefox' egne ADMX-skabeloner eller en Intune-profil. Læg `.xpi`-filen et sted, alle pc'er kan nå, fx:

- lokalt: `file:///C:/ProgramData/Klarsyn/klarsyn.xpi` (filen skal så kopieres ud til hver pc)
- netværksdrev eller en intern `https://`-adresse

Mozillas reference: <https://firefox-admin-docs.mozilla.org/reference/policies/extensionsettings/>

---

## Del 3: Kontrollér før prøven

1. `about:policies`: **ExtensionSettings** og **3rdparty** står under "Active", og der er ingen fejl under "Errors".
2. `about:addons`: Klarsyn står som installeret, og knapperne til at fjerne og deaktivere mangler eller er grå.
3. Luk og åbn Firefox igen. Klarsyn skal stadig være der.
4. Åbn `https://www.google.com/search?q=test&udm=50`. Spærreskærmen skal vises.
5. Har du brugt `-BlockAiChatServices`: åbn `https://manus.im`. Spærreskærmen skal vises.

## Opdatering til en ny version

1. Byg, og få den nye version signeret (Del 1).
2. Kør scriptet igen med den nye `.xpi`, eller udskift filen på delt drev/server.
3. Firefox opdaterer udvidelsen, når filen ændrer sig. Kontrollér versionen på `about:addons`.

---

## English summary

Temporary add-ons are removed when Firefox closes. For permanent, student-proof installs:
(1) have Mozilla sign Klarsyn as **unlisted** (web upload at addons.mozilla.org, or `npm run sign:firefox` with `WEB_EXT_API_KEY`/`WEB_EXT_API_SECRET`), then
(2) force-install it with `ExtensionSettings` → `installation_mode: "force_installed"`, either with `scripts\windows\Install-KlarsynFirefox.ps1` (run as administrator) or with Intune/GPO using `docs/firefox-policies.example.json`.
Verify at `about:policies` and `about:addons`. The PowerShell script has not been run on Windows yet. Test it on one machine first.
