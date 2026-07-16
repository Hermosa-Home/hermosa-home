# Hermosa Home — Documento Tecnico di Architettura
**Versione:** 3.0 (fix-v8) · **Data:** Aprile 2026  
**Utilizzabile come prompt di contesto per Claude**

---

## 1. PANORAMICA

Due app web **single-file** su GitHub Pages. Nessun backend. Tutti i dati in `localStorage`.

```
GitHub: Hermosa-Home/hermosa-home
URL:    https://hermosa-home.github.io/hermosa-home/

├── gestionale.html       → App gestore (uso interno)
├── index.html            → App ospite (link via WhatsApp)
├── sw-gestionale.js      → Service Worker v5 (Network-First)
├── manifest.json         → PWA ospite
└── manifest-gestionale.json → PWA gestionale
```

---

## 2. GESTIONALE — gestionale.html (~3050 righe)

### Stack
- HTML5 + CSS3 (variabili custom `--terra`, `--sand`, ecc.)
- Vanilla JS (ES5/ES6, no framework)
- Leaflet.js v1.9.4 (CDN) per mappa
- Font: Cormorant Garamond + DM Sans (Google Fonts)

### Layout
```
<body> display:flex
├── .sidebar-overlay (mobile)
├── <aside class="sidebar"> (fixed 260px)
└── .main
    ├── .topbar (sticky 58px) — bottoni: 🔄 ricarica · ☁️ Drive · + Prenotazione
    └── .content
        └── .panel (display:none) / .panel.active (display:block)
```

### Struttura script
Il file ha **3 blocchi `<script>`**:
1. **`<head>`** — tutto il JS principale (~1600 righe). Nota: il codice è in `<head>` ma le funzioni DOM-dipendenti usano `DOMContentLoaded`.
2. **`<body>` inizio** — cache-buster SW (12 righe)
3. **`<body>` fine** — Service Worker registration + PWA install prompt

### Navigazione
```js
nav(id, el, title)
// nasconde tutti .panel → mostra #panel-{id}
// se id==='calendario' → aggiornaCalendario()
// se id==='mappa'     → initMap() (lazy Leaflet)
```

### Pannelli (17 totali)
| ID | Descrizione |
|---|---|
| `dashboard` | Stats + prenotazioni dinamiche + azioni urgenti |
| `prenotazioni` | Tabella `<tbody id="prenotazioni-tbody">` — render dinamico |
| `calendario` | Griglia mese/suite generata da `renderCalendar()` |
| `suites` | Schede 3 suite (hardcoded) |
| `prezzi` | Prezzi stagionali per suite |
| `contratti` | `<tbody id="contratti-tbody">` — render dinamico |
| `documenti` | `<tbody id="doc-table-body">` + `<div id="alloggiati-cards">` — dinamici |
| `alloggiati` | `<tbody id="alloggiati-tbody">` — dinamico |
| `notifiche` | Feed + toggles automazioni |
| `automazioni` | Editor template messaggi |
| `pagamenti` | Richiesta pagamento ospite |
| `pulizie` | Checklist + manutenzione |
| `statistiche` | KPI, grafici incassi |
| `guidapalermo` | Guida Palermo inviabile |
| `mappa` | Leaflet + come arrivare |
| `smartlock` | Serrature + invio link accesso |
| `anagrafica` | Config struttura → `CFG` + `localStorage` |

### Modali (10)
`modal-booking` · `modal-contratto` · `modal-notifica` · `modal-pagamento` · `modal-dettaglio` · `modal-doc-invia` · `modal-doc-preview` · `modal-manutenzione` · `modal-contratto-view` · `modal-pulizie`

```js
openModal(id)   // aggiunge classe .open
closeModal(id)  // rimuove classe .open
// Click esterno chiude modal — listener in DOMContentLoaded
```

---

## 3. STRUTTURA DATI (localStorage)

### `hh_bookings` — Array prenotazioni
```js
{
  id: 'b'+Date.now(),           // es: 'b1774465696429'
  guest: 'Antonino Lo Bello',
  phone: '+39 328 484 5555',
  waNum: '393284845555',        // normalizzato per wa.me
  email: 'test@gmail.com',
  suite: 'Florio',              // 'Tomasi di Lampedusa'|'Florio'|'Stabile'
  ospiti: 2,
  checkin: '2026-04-10',        // ISO YYYY-MM-DD
  checkout: '2026-04-15',
  importo: 400,
  source: 'diretto',
  contratto: 'non_inviato',     // 'non_inviato'|'attesa'|'firmato'
  doc: 'mancante',              // 'mancante'|'da_verificare'|'ok'
  pagamento: 'mancante'         // 'mancante'|'ok'
}
```

### `hh_cfg` — Configurazione struttura (oggetto `CFG`)
```js
{ nome, ragione, piva, cf, tel, whatsapp, email, telegram,
  paypal, stripe, iban, checkin_default, checkout_default, prezzi:{} }
```

### `hh_doc_{bookingId}` — Documento ospite (da app ospite)
```js
{ tipo:'Carta d\'identità', data:'01/04/2026', bookingId:'b123',
  guest:'Ospite', dataUrl:'data:image/jpeg;base64,...' }  // dataUrl può mancare se troppo grande
```

### `hh_firma_{bookingId}` — Firma contratto (da app ospite)
```js
{ firmato: true, data: '01/04/2026', guest: 'Ospite' }
```

### Altri
- `hh_prezzi` — prezzi stagionali
- `hh_ical` — link iCal sync
- `hh_interventi` — interventi manutenzione
- `hh_sw_ver` — versione cache-buster SW

---

## 4. FUNZIONI JS PRINCIPALI — gestionale.html

### Render dinamico (TUTTO da localStorage, nessun HTML hardcoded)
```js
renderPrenotazioni()   // → <tbody id="prenotazioni-tbody">
renderContratti()      // → <tbody id="contratti-tbody">
renderDashboard()      // → <div id="dash-bookings-list"> (ultimi 30gg + future)
renderDocumenti()      // → <tbody id="doc-table-body"> + update select
renderAlloggiati()     // → <tbody id="alloggiati-tbody"> + <div id="alloggiati-cards">
renderAll()            // chiama tutte le render + aggiornaBadge + aggiornaSelectOspiti
```

### Gestione stati
```js
aggiornaStatoBooking(id, field, value)  // es: ('b123','contratto','firmato')
segnaContrattoFirmato(id)
segnaDocOk(id)
segnaPagamentoOk(id)
```

### Sync con app ospite
```js
ricaricaDati()          // bottone 🔄 — legge hh_firma_ + hh_doc_ + hh_bookings
// window.addEventListener('storage') — auto-sync se stessa tab
```

### Link app ospite (URL corto!)
```js
buildAppLink(bk)        // → APP_URL + '?booking=HH-' + id + '&t=' + token
codificaBookingPerURL(bk) // pipe-separated base64 → ~148 chars (NON JSON!)
// Formato: id|guest|suite|checkin|checkout|importo|phone|email|ospiti
```

### Messaggi WhatsApp
```js
// Tutti i messaggi usano buildAppLink(bk) — mai ?d= (troppo lungo)
// Template ben formattati, link su riga propria
```

### Contratto
```js
generaTestoContratto(bk)  // genera testo con clausole 1-9 + CARTA DI CREDITO
visualizzaContratto(id)   // apre modal-contratto-view
inviaContrattoWA()
scaricaContratto(id)      // download .txt
```

### Backup / Drive
```js
esportaBackup()           // scarica JSON con tutti i dati
salvaBackupSuDrive()      // download + apre Google Drive
scaricaDocumentoOspite(id)
salvaSuDriveDocumento(id)
```

### openDettaglio(id)
Popola `modal-dettaglio` con:
- Badge stati (contratto/doc/pagamento)
- Bottoni aggiorna stato (`det-stato-btns`)
- Contatti ospite con link WA/Email
- Bottoni: Messaggio · Contratto · Documenti · Cancella

---

## 5. APP OSPITE — index.html (~890 righe)

### Funzionamento URL
Il link WA ha formato: `?booking=HH-{id}&t={token_compatto}`

`getBookingFromURL()` tenta in ordine:
1. **localStorage** (stesso browser del gestionale — stesso device)
2. **`?t=` token compatto** (pipe-separated, decodifica `atob` + `escape`)
3. **`?d=` token JSON** (vecchio formato, retrocompatibilità)

Se nessuno funziona → mostra errore "Dati non trovati — usa il link WhatsApp".

### Sezioni
- `page-home` — hero + soggiorno card + 6 tiles
- `page-lock` — smart lock + PIN backup
- `page-docs` — upload documento con compressione iOS
- `page-contratto` — testo contratto + firma digitale
- `page-pagamento` — PayPal + IBAN copia
- `page-info` — WiFi + regole + attrazioni
- `page-mappa` — come arrivare

### Firma digitale (iOS-safe)
```html
<!-- IMPORTANTE: onchange inline, NON addEventListener (bug iOS WebKit) -->
<input type="checkbox" id="firma-check-1" onchange="aggiornaFirmaBtn()">
<input type="checkbox" id="firma-check-2" onchange="aggiornaFirmaBtn()">
<!-- Bottone NON ha attributo disabled (bug iOS) -->
<button id="firma-btn" onclick="firmaContratto()">
```
```js
firmaContratto()  // verifica checkbox al momento del click
// Salva: hh_bookings[idx].contratto='firmato' + hh_firma_{id}
// Poi apre WA al gestore con notifica
```

### Upload documento (iOS-safe)
```js
handleDocUpload(input)
// Compressione automatica: >4MB→600px, >2MB→800px, else→1000px
// Salva in ENTRAMBI window._docTemp E sessionStorage._hhDocTemp
// (sessionStorage sopravvive alla sospensione tab di iOS)

salvaDocumento()
// Recupera da window._docTemp ?? sessionStorage._hhDocTemp
// Tentativo salvataggio con compressione progressiva (q=1 → 0.4 → 0.3 → 0.2)
// Se fallisce per quota: salva solo metadati + apre WA gestore con notifica
```

---

## 6. SERVICE WORKER — sw-gestionale.js

**Versione:** `hermosa-gestionale-v5`  
**Strategia:** Network-First (scarica sempre fresco, usa cache solo offline)

**Cache-buster in gestionale.html:** al primo caricamento dopo aggiornamento,
cancella tutti i vecchi SW e ricarica la pagina automaticamente.

---

## 7. CONTRATTO — clausole

Il contratto include **9 condizioni**:
1-7. Standard locazione turistica
8. **CARTA DI CREDITO A GARANZIA** — fornire dati carta, non addebitata salvo danni
9. In caso danni accertati, il locatore può addebitare sulla carta fornita

---

## 8. PALETTE COLORI

```css
--sand:#F5F0E8  --cream:#FAF7F2  --terra:#C4956A  --terra-d:#A07550
--terra-l:#E8D5BE  --terra-xl:#F5EAD8  --deep:#2C2416  --mid:#6B5C48
--soft:#9B8B78  --white:#FFF  --success:#5A8A6A  --danger:#C4706A
--info:#6A7A9B  --gold:#C9A84C  --sidebar-w:260px
```

---

## 9. REGOLE PER AI — COME MODIFICARE QUESTA APP

1. **Mai introdurre dipendenze esterne** (solo Leaflet via CDN è consentita)
2. **Mantenere single-file** — tutto in gestionale.html e index.html
3. **Tabelle sempre dinamiche** — mai HTML hardcoded nelle tbody dei pannelli
4. **Dopo ogni modifica a bookings[]**: chiamare `saveBookings()` + `renderAll()`
5. **Link app ospite**: usare sempre `buildAppLink(bk)` — mai costruire URL manualmente
6. **Messaggi WA**: link su riga propria, nessun base64 nel corpo del messaggio
7. **iOS firma**: usare `onchange` inline sulle checkbox, mai `addEventListener`
8. **iOS upload**: salvare dati in `sessionStorage` oltre che in `window._docTemp`
9. **localStorage keys** definiti: `hh_bookings`, `hh_cfg`, `hh_prezzi`, `hh_ical`, `hh_interventi`, `hh_doc_{id}`, `hh_firma_{id}`, `hh_sw_ver`

---

## 10. BUG NOTI RISOLTI (storico)

| Bug | Fix |
|---|---|
| HTML orfano → bottoni floating a destra | Rimosso blocco HTML fuori dal modal |
| SyntaxError `openDettaglio(''+id+'')` | Corrette virgolette escaped |
| `querySelectorAll('.modal-backdrop')` in `<head>` | Spostato in `DOMContentLoaded` |
| Funzioni duplicate (`openDettaglio`, `aggiornaBadge`, ecc.) | Rimosse prime definizioni |
| SW Cache-First → aggiornamenti ignorati | Nuovo SW Network-First v5 |
| `?d=` URL 500+ chars → WhatsApp tronca | Nuovo `?t=` pipe-format 148 chars |
| iOS firma: `addEventListener` non si attiva | `onchange` inline + no `disabled` |
| iOS upload: `window._docTemp` perso | Backup in `sessionStorage` |
| `QuotaExceededError` foto grandi | Compressione progressiva canvas |
| Dashboard mostra solo prenotazioni future | Finestra 30gg passati + future |
| Tutti i panel hardcoded → dati non aggiornati | `renderAll()` da localStorage |

---

*Aggiornare questo documento ad ogni modifica strutturale.*
