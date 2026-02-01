# 🤖 AI Startup Scouting System

Sistema automatizzato per lo scouting di startup da acceleratori europei, con arricchimento dati tramite Google Gemini AI.

## 📋 Panoramica

Questo progetto automatizza il processo di ricerca e catalogazione startup:
1. **Discovery**: Popolazione database acceleratori
2. **Extraction**: Scraping automatico portfolio startup
3. **Enrichment**: Generazione value proposition tramite AI

**🔗 Demo Progetto**: [Visualizza Google Sheet](https://docs.google.com/spreadsheets/d/1kpZ2EVicSDB-NCgVQ3u1trk00IhItg4vpkJ7F4gsEHQ/edit?usp=sharing)

> ⚠️ **Importante**: Il foglio demo è in **sola lettura**. Per utilizzare le funzionalità del menu AI:
> 1. Apri il link sopra
> 2. **File → Crea una copia**
> 3. Nella tua copia personale, segui la sezione **Setup** per configurare l'API key

---

## 🏗️ Architettura

### Stack Tecnologico
- **Runtime**: Google Apps Script (JavaScript ES6)
- **AI**: Google Gemini 2.0 Flash (`gemini-3-27b-it`)
- **Storage**: Google Sheets
- **APIs**: IP Geolocation API (ip-api.com)

### Architettura Multi-Source per Discovery Acceleratori

Il sistema è progettato con supporto per **multiple fonti dati** e fallback automatico:

**Priorità di acquisizione dati:**
1. **API Esterne** (se configurate)
   - Crunchbase API v4
   - F6S API
   - Endpoint custom configurabile
2. **Seed List Locale** (fallback/standalone)
   - 5 acceleratori verificati manualmente
   - Garantisce funzionamento immediato senza dipendenze

**Perché il sistema è predisposto per API esterne?**

L'implementazione iniziale tentava il discovery automatico tramite scraping di Google Search (query: "european startup accelerators"). Tuttavia, Google blocca richieste automatiche con errore **HTTP 429** (anti-bot protection / rate limiting).

Per una soluzione scalabile in produzione, il codice è già predisposto per integrare API professionali che forniscono database strutturati di acceleratori:

- **Crunchbase API** 
- **F6S API** 
- **API Custom** 

**Come attivare le API esterne (opzionale):**

In Apps Script Editor → **Impostazioni Progetto** → **Proprietà Script**, aggiungi:
```
CRUNCHBASE_API_KEY = ""
```

Oppure per API custom:
```
ACCELERATOR_API_URL = ""
ACCELERATOR_API_KEY = ""
```

Il sistema rileva automaticamente la presenza delle chiavi e passa alla fonte API, mantenendo la seed list come fallback.

**Vantaggi dell'architettura:**
- ✅ **Zero configurazione richiesta**: funziona subito con seed list locale
- ✅ **Resilienza**: fallback automatico se API non disponibile
- ✅ **Estensibilità**: facile aggiungere nuove fonti dati

### Struttura File
```
src/
├── Main.gs                    # Menu UI e funzioni trigger
├── Config.gs                  # Configurazioni globali e costanti
├── UrlUtils.gs                # Normalizzazione URL, validazione, geolocation
├── SheetUtils.gs              # CRUD operations su Google Sheets
├── GeminiClient.gs            # Client API Gemini
├── ScoutAccelerators.gs       # Discovery acceleratori (multi-source)
├── ScoutStartups.gs           # Scraping portfolio startup
└── ValueProposition.gs        # Generazione value prop con AI
```

---

## 🚀 Setup e Utilizzo

### Prerequisiti
- Account Google
- Gemini API Key gratuita ([ottieni qui](https://aistudio.google.com/app/apikey))

### Installazione

1. **Crea la tua copia del foglio**
   - Apri il [Google Sheet demo](https://docs.google.com/spreadsheets/d/1kpZ2EVicSDB-NCgVQ3u1trk00IhItg4vpkJ7F4gsEHQ/edit?usp=sharing)
   - **File → Crea una copia** (il foglio originale è read-only)

2. **Configura Gemini API Key**
   - Nel tuo foglio: Menu `🤖 Startup Scouting AI` → `⚙️ Configura API Key Gemini`
   - Incolla la tua API key 
   - La chiave viene salvata in modo sicuro (PropertiesService)

3. **Verifica Setup**
   - Menu: `🤖 Startup Scouting AI` → `🧪 Test Configurazione`
   - Controlla che tutti i check siano ✅
   - Se dovesse fallire qualche script controllare se si sono garantite le dovute autorizzaazzioni

### Comandi Disponibili

#### 1️⃣ Scouting Acceleratori
Popola il database con acceleratori target.

**Cosa fa:**
- Se API configurata: fetch da Crunchbase/F6S/Custom
- Altrimenti: usa seed list locale (5 acceleratori verificati)
- Verifica raggiungibilità siti (HTTP 200)
- Gestisce duplicati automaticamente (idempotenza)

**Quando usare:** Prima esecuzione o per aggiungere nuovi batch

**Log indica la fonte**: "Fonte dati: API Esterna" oppure "Fonte dati: Seed List Locale"

---

#### 2️⃣ Aggiorna Startup dagli Acceleratori
Estrae startup dai portfolio degli acceleratori presenti nel foglio.

**Cosa fa:**
- Trova pagina portfolio per ogni acceleratore (euristica: `/companies`, `/portfolio`, etc.)
- Estrae link esterni ed elimina social media/CDN/asset (font, CSS, JS)
- Estrae nome startup da meta tag `<title>` con fallback intelligente al dominio
- Geolocalizza country tramite IP lookup (ip-api.com)
- Inserisce startup evitando duplicati

**Configurazione:** All'avvio chiede quante startup processare per acceleratore
- Default: 10
- `0` = nessun limite (tutte le startup disponibili)

**Tempo stimato:** 2-5 minuti per 5 acceleratori × 10 startup ciascuno

---

#### 3️⃣ Genera Value Proposition Mancanti
Arricchisce dati startup con value proposition via AI.

**Cosa fa:**
- Fetcha meta tags (title, description) + body snippet da ogni sito startup
- Invia a Gemini con prompt strutturato
- Forza output in formato fisso: `"[Name] helps [target] do [action] so that [benefit]"`
- Valida e corregge automaticamente format non conformi

**Tempo stimato:** ~2 minuto per 10 startup

---

## 🧠 Decisioni Tecniche

### Country Detection: IP Geolocation

**Problema:** Determinare il paese di una startup da un sito `.com` in inglese è complesso. Le meta tag HTML raramente contengono informazioni geografiche esplicite.

**Soluzione implementata:** IP Geolocation API
- Estrae indirizzo IP del server tramite DNS lookup del dominio
- Query a ip-api.com (free tier: 45 req/min, no API key required)
- Restituisce paese basato su geolocalizzazione IP dell'infrastruttura

**Limitazione consapevole:** Il country riflette dove è hostato il server, non sempre coincide con la sede legale (es. startup francese su AWS US-East → "United States").

**Trade-off accettato:** Preferibile avere un dato parzialmente accurato che nessun dato.

---

### Discovery Acceleratori: Seed List + API-Ready

**Approccio iniziale tentato:** Scraping dinamico di Google Search per query "european startup accelerators".

**Problema riscontrato:** Google blocca richieste automatiche con errore **HTTP 429** (anti-bot / rate limiting). Bypassare richiederebbe proxy rotating, CAPTCHA solving, o servizi terzi (fuori scope).

**Soluzione a due livelli:**
1. **Immediata (seed list)**: 5 acceleratori verificati manualmente, garantisce funzionamento standalone
2. **Scalabile (API)**: Architettura predisposta per Crunchbase/F6S API

**Estensibilità manuale:** L'utente può aggiungere acceleratori direttamente nel foglio; la Funzione 2 li processerà automaticamente.

---

### Value Proposition: Formato Strutturato via Prompt Engineering

**Requisito:** Output in formato fisso `"[Name] helps [target] do [action] so that [benefit]"`.

**Implementazione:**
- Prompt con esempi concreti (Stripe, Notion)
- Output forzato in JSON per parsing deterministico
- Validazione post-generazione 
- Auto-correzione per format non conformi 

**Risultato:** >90% delle value proposition rispettano il formato al primo tentativo.

---

## ⚠️ Limitazioni e Assunzioni

### Scraping
- **Copertura parziale:** Non tutti gli acceleratori hanno portfolio pubblici o pagine strutturate
- **Falsi positivi/negativi:** Alcuni link estratti potrebbero non essere startup (blog, case studies), o startup potrebbero mancare se usano path non standard
- **No JavaScript rendering:** Apps Script `UrlFetchApp` non esegue JS client-side. Siti SPA (React/Vue) senza SSR forniscono HTML minimale
- **Anti-scraping:** Alcuni siti potrebbero bloccare richieste automatiche (mitigazione: User-Agent spoofing, rate limiting)

### Country Detection
- **Server location ≠ HQ:** Geolocation IP indica dove è hostata l'infrastruttura (Cloudflare CDN, AWS region), non sempre corrisponde alla sede legale

### Value Proposition
- **Qualità input-dipendente:** Se il sito ha meta tag scarse o contenuto poco chiaro, Gemini potrebbe generare value prop generiche
- **Possibili allucinazioni:** L'AI potrebbe inferire dettagli non esplicitamente presenti (mitigato via prompt engineering: "focus on facts from content")

### Performance
- **Timeout Apps Script:** Esecuzione limitata a 6 minuti. Batch grandi (>50 startup) potrebbero andare in timeout
  - Soluzione: limitare batch size o eseguire comando multiplo
- **Rate Limits API:** Gemini free tier = 15 req/min

---

## 📚 Riferimenti Tecnici

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Gemini API Reference](https://ai.google.dev/api/rest)
- [ip-api.com Documentation](https://ip-api.com/docs)
- [Crunchbase API v4](https://data.crunchbase.com/docs) (opzionale)

---

## 📄 Licenza

MIT License - Questo progetto è open source e può essere utilizzato liberamente per scopi educativi e commerciali.

