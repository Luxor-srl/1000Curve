# 🚗 1000curve App

![Logo 1000curve](assets/images/1000curve_logo.png)

Un'app React Native/Expo per gestire le tappe e i "cookie" della gara 1000curve. Perfetta per piloti che vogliono tracciare i loro tempi e progressi in gara!

## 📱 Funzionalità Principali

- 🔐 **Login e selezione gara**: Scegli la tua gara e profilo pilota
- 🔍 **Ricerca tappa**: Inserisci il codice per vedere dettagli e posizione
- 📍 **Geolocalizzazione**: Verifica automatica della vicinanza alla tappa
- ⏱️ **Countdown**: 10 secondi di preparazione prima della registrazione
- 🍪 **Cookie completati**: Visualizza le tappe finite direttamente in app
- 📊 **Tabella responsive**: Ottimizzata per dispositivi mobili
- 📱 **Sidebar Off-Run**: Navigazione moderna con animazioni, feedback aptico e menu: Gare, Cookie, Lista, Run, Classifiche (soon), Profilo (soon)

## 📂 Struttura del Codice

```
1000curve/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── off-run.tsx       # Pagina off-run con sidebar
│   ├── race.tsx          # Schermata principale gara
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── explore.tsx
│   │   └── index.tsx
│   └── StartScreen.tsx
├── components/
│   ├── Sidebar.tsx       # Sidebar animata con haptics
│   ├── AnimatedWave.tsx
│   ├── Collapsible.tsx
│   ├── ExternalLink.tsx
│   ├── HapticTab.tsx
│   ├── HelloWave.tsx
│   ├── ParallaxScrollView.tsx
│   ├── RaceHeader.tsx
│   ├── ThemedText.tsx
│   ├── ThemedView.tsx
│   ├── YellowGradientBackground.tsx
│   └── ui/
│       ├── IconSymbol.ios.tsx
│       ├── IconSymbol.tsx
│       ├── TabBarBackground.ios.tsx
│       └── TabBarBackground.tsx
├── constants/
│   └── Colors.ts
├── hooks/
│   ├── useColorScheme.ts
│   ├── useColorScheme.web.ts
│   └── useLiveLocation.ts
│   └── useThemeColor.ts
├── utils/
│   ├── auth.ts
│   └── geo.ts
├── assets/
│   ├── fonts/
│   └── images/
├── android/
├── ios/
├── scripts/
├── constants/
└── package.json, etc.
```

## 🔌 API Principali

- `GET /CRMRaceLog` - Registra tempo tappa
- `GET /Racer?action=get&getAction=raceLocationDone` - Verifica completamento
- `GET /Racer?action=get&getAction=getRacerLocationTimesHtml` - Tabella cookie HTML

## 🚀 Come Iniziare

1. **Installa dipendenze**:
   ```bash
   npm install
   ```

2. **Avvia in sviluppo**:
   ```bash
   npx expo start
   ```

## 💡 Note

- API richiedono header e cookie specifici
- Ottimizzata per iOS e Android

---

*Creato con ❤️ per la comunità 1000curve*
