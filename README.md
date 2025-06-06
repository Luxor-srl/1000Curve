# 1000curve App

Questa è un'app React Native/Expo per la gestione delle tappe e dei "cookie" della gara 1000curve.

## Funzionalità principali

- **Login e selezione gara**: L'utente può selezionare la gara e il proprio profilo pilota.
- **Ricerca tappa**: Inserisci il codice della tappa per visualizzare i dettagli e la posizione.
- **Geolocalizzazione**: L'app verifica la distanza dalla tappa e abilita il pulsante "START" solo se sei vicino.
- **Countdown**: Premendo "START" parte un countdown di 10 secondi. Al termine viene inviata la registrazione del tempo tramite chiamata API.
- **Cookie completati**: Pulsante sempre visibile che mostra la tabella delle tappe completate (cookie) direttamente in app.
- **Visualizzazione tabella**: La tabella dei cookie è leggibile e responsive, ottimizzata per mobile.

## Struttura del progetto

- `app/race.tsx`: Schermata principale della gara e gestione tappe/cookie.
- `components/`: Componenti UI riutilizzabili.
- `hooks/`: Hook personalizzati (es. geolocalizzazione).
- `utils/`: Utility varie (es. calcolo distanza GPS).
- `assets/`: Immagini e font.

## API principali

- `GET /CRMRaceLog?action=set&setAction=setRacerLocationTime&...`  
  Registra il tempo di completamento tappa.
- `GET /Racer?action=get&getAction=raceLocationDone&...`  
  Verifica se la tappa è già stata completata.
- `GET /Racer?action=get&getAction=getRacerLocationTimesHtml&...`  
  Restituisce la tabella HTML dei cookie completati.

## Avvio progetto

1. Installa le dipendenze:
   ```sh
   npm install
   ```
2. Avvia l'app in modalità sviluppo:
   ```sh
   npx expo start
   ```

## Note


- Le chiamate API richiedono header e cookie specifici per funzionare correttamente.

---
