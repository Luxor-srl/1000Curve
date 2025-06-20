import RaceHeader from '@/components/RaceHeader'; // Importa il nuovo componente
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { clearAuthData } from '@/utils/auth';
import { getDistanceFromLatLonInMeters } from '@/utils/geo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Keyboard, Linking, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
// Chiave per i cookie in attesa offline
const PENDING_COOKIES_KEY = 'pendingCookies';
// Funzione per aggiungere un cookie alla coda offline
interface PendingCookie {
  racerId: string | number;
  racerClientId: string | number;
  raceLocationCode: string | number;
  timestamp: number;
}

const addPendingCookie = async (cookie: PendingCookie): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(PENDING_COOKIES_KEY);
    let arr: PendingCookie[] = [];
    if (existing) arr = JSON.parse(existing);
    arr.push(cookie);
    await AsyncStorage.setItem(PENDING_COOKIES_KEY, JSON.stringify(arr));
    console.log('[OFFLINE] Cookie aggiunto alla coda:', cookie);
  } catch (e) {
    console.error('[OFFLINE] Errore salvataggio cookie offline:', e);
  }
};

// Funzione per inviare tutti i cookie in attesa
const sendPendingCookies = async () => {
  try {
    const existing = await AsyncStorage.getItem(PENDING_COOKIES_KEY);
    if (!existing) return;
    let arr = JSON.parse(existing);
    if (!Array.isArray(arr) || arr.length === 0) return;
    const headers = {
      'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      'Accept': '*/*',
      'Accept-Language': 'it',
      'Referer': 'https://crm.1000curve.com/app/race.html',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    };
    let newArr = [];
    for (const cookie of arr) {
      try {
        const params = new URLSearchParams({
          action: 'set',
          setAction: 'setRacerLocationTime',
          racerId: cookie.racerId,
          racerClientId: cookie.racerClientId,
          raceLocationCode: cookie.raceLocationCode,
          timestamp: String(cookie.timestamp),
        });
        const url = `https://crm.1000curve.com/CRMRaceLog?${params.toString()}`;
        const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
        const text = await response.text();
        if (text.trim() === 'SUCCESS') {
          console.log('[OFFLINE] Cookie inviato con successo:', cookie);
        } else {
          newArr.push(cookie); // Non eliminare se non successo
        }
      } catch (e) {
        newArr.push(cookie); // Mantieni in coda se errore
      }
    }
    await AsyncStorage.setItem(PENDING_COOKIES_KEY, JSON.stringify(newArr));
  } catch (e) {
    console.error('[OFFLINE] Errore invio cookie offline:', e);
  }
};
// Effetto: invia i cookie in attesa quando torna online
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      sendPendingCookies();
    }
  });
  // Prova anche all'avvio
  sendPendingCookies();
  return () => unsubscribe();
}, []);
// @ts-ignore

export default function RaceScreen() {
  const { raceData } = useLocalSearchParams();
  const router = useRouter();
  const [parsed, setParsed] = useState<any>(null);
  const [racer, setRacer] = useState<any>(null);
  const [stageCode, setStageCode] = useState('');
  const [foundStage, setFoundStage] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stageDone, setStageDone] = useState<boolean | null>(null);

  const [searchingStage, setSearchingStage] = useState(false);
  const [cookieCheckMessage, setCookieCheckMessage] = useState<string | null>(null);
  
  // Timer states
  const [raceTimer, setRaceTimer] = useState<string>('');
  const [raceInfo, setRaceInfo] = useState<any>(null);
  
  // Drawer state and animation
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700; // Consideriamo piccoli gli schermi sotto i 700px

  // RoadBook/Cookie data state
  const [cookiesList, setCookiesList] = useState<any[]>([]);
  const [loadingCookies, setLoadingCookies] = useState(false);

  // Recupera i dati del racer aggiornati (inclusi id, clientId, number, email)
  useEffect(() => {
    const loadRacerData = async () => {
      try {
        const racerDataString = await AsyncStorage.getItem('racerData');
        if (racerDataString) {
          const racerObj = JSON.parse(racerDataString);
          setRacer(racerObj);
          // Aggiorna subito la lista dei cookie dopo aver caricato il racer
          setTimeout(() => {
            loadCookiesList();
          }, 0);

          // Aggiorna i dati della gara con una chiamata a /Race
          if (racerObj.raceslug) {
            try {
              const headers = {
                'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
              };
              const params = new URLSearchParams({
                action: 'get',
                getAction: 'getRace',
                slug: racerObj.raceslug,
              });
              const url = `https://crm.1000curve.com/Race?${params.toString()}`;
              const response = await fetch(url, { method: 'GET', headers });
              const text = await response.text();
              let data = null;
              try {
                data = text ? JSON.parse(text) : null;
              } catch (e) {
                console.error('Errore parsing JSON /Race:', e, text);
              }
              if (data) {
                setParsed(data);
                await AsyncStorage.setItem('raceData', JSON.stringify(data));
              }
            } catch (e) {
              console.error('Errore aggiornamento dati gara /Race:', e);
            }
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento dati racer:', error);
      }
    };
    loadRacerData();
  }, []);

  // Recupera i dati della gara per il timer
  useEffect(() => {
    const fetchRaceInfo = async () => {
      if (!racer) return;
      
      try {
        const headers = {
          'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
        };
        const params = new URLSearchParams({
          action: 'get',
          getAction: 'getRaces',
        });
        const url = `https://crm.1000curve.com/Race?${params.toString()}`;
        const response = await fetch(url, { method: 'GET', headers });
        const data = await response.json();
        
        if (data && Array.isArray(data.races)) {
          // Trova la gara corrispondente allo slug del racer
          const currentRace = data.races.find((race: any) => race.slug === racer.raceslug);
          if (currentRace) {
            setRaceInfo(currentRace);
          }
        }
      } catch (error) {
        console.error('Errore nel recupero informazioni gara:', error);
      }
    };

    fetchRaceInfo();
  }, [racer]);

  // Timer effect per countdown fino alla fine della gara
  useEffect(() => {
    if (!raceInfo) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const startTime = raceInfo.startDateTimestamp;
      const finishTime = raceInfo.finishDateTimestamp;

      if (now < startTime) {
        // Gara non ancora iniziata - countdown all'inizio
        const timeToStart = startTime - now;
        const days = Math.floor(timeToStart / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeToStart % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeToStart % (1000 * 60)) / 1000);
        
        if (days > 0) {
          setRaceTimer(`Inizio tra: ${days}g ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setRaceTimer(`Inizio tra: ${hours}h ${minutes}m ${seconds}s`);
        } else {
          setRaceTimer(`Inizio tra: ${minutes}m ${seconds}s`);
        }
      } else if (now > finishTime) {
        // Gara terminata
        setRaceTimer('Gara terminata');
      } else {
        // Gara in corso - countdown alla fine
        const timeRemaining = finishTime - now;
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        if (days > 0) {
          setRaceTimer(`${days}g ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setRaceTimer(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setRaceTimer(`${minutes}m ${seconds}s`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [raceInfo]);

  // Hook posizione live: deve stare sopra gli useEffect che la usano
  const { location } = useLiveLocation();
  
  // Countdown effect: deve stare qui, fuori dal return!
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      // Countdown terminato: invia chiamata a /CRMRaceLog oppure salva offline
      (async () => {
        if (!racer || !foundStage) return;
        try {
          // Attendi 2 secondi per mostrare il "GO"
          await new Promise(resolve => setTimeout(resolve, 2000));
          const timestamp = Date.now();
          // Controlla se online
          const netState = await NetInfo.fetch();
          if (netState.isConnected) {
            // Online: invia subito
            const params = new URLSearchParams({
              action: 'set',
              setAction: 'setRacerLocationTime',
              racerId: racer.racerid,
              racerClientId: racer.racerclientid,
              raceLocationCode: foundStage.code,
              timestamp: String(timestamp),
            });
            const url = `https://crm.1000curve.com/CRMRaceLog?${params.toString()}`;
            const headers = {
              'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
              'Accept': '*/*',
              'Accept-Language': 'it',
              'Referer': 'https://crm.1000curve.com/app/race.html',
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            };
            const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
            const text = await response.text();
            console.log('Risposta /CRMRaceLog:', text);
            if (text.trim() === 'SUCCESS') {
              setStageDone(true);
              setCountdown(null);
              Alert.alert('Cookie registrato!', 'Hai completato correttamente la tappa.');
            } else if (text.trim() === 'EXISTS') {
              setCountdown(null);
              setStageDone(true);
            } else {
              setCountdown(null);
            }
          } else {
            // Offline: salva in coda
            await addPendingCookie({
              racerId: racer.racerid,
              racerClientId: racer.racerclientid,
              raceLocationCode: foundStage.code,
              timestamp,
            });
            setStageDone(true);
            setCountdown(null);
            Alert.alert('Cookie registrato offline', 'Il cookie verrà inviato automaticamente quando tornerai online.');
          }
        } catch (e) {
          console.error('Errore invio tempo cookie:', e);
          setCountdown(null);
        }
      })();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (typeof c === 'number' && c > 0 ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, racer, foundStage]);

  // Effetto: interrompi il countdown se ci si allontana oltre 100 metri dal cookie
  useEffect(() => {
    if (countdown === null || !foundStage || !location) return;
    const distance = getDistanceFromLatLonInMeters(
      location.latitude,
      location.longitude,
      Number(foundStage.latitude),
      Number(foundStage.longitude)
    );
    if (distance > 100) {
      setCountdown(null);
      setStageDone(null);
      Alert.alert('Attenzione', 'Ti stai allontanando, torna nella zona del cookie');
    }
  }, [location, countdown, foundStage]);

  useEffect(() => {
    if (raceData) {
      try {
        setParsed(JSON.parse(decodeURIComponent(raceData as string)));
      } catch {
        setParsed(null);
      }
    }
  }, [raceData]);

  // Funzione per caricare la lista dei cookie dal roadbook
  const loadCookiesList = async () => {
    if (!racer) return;
    
    setLoadingCookies(true);
    try {
      const params = new URLSearchParams({
        action: 'get',
        getAction: 'getRacerLocationTimes',
        format: 'json',
        id: racer.racerid,
        clientId: racer.racerclientid,
      });
      const url = `https://crm.1000curve.com/Racer?${params.toString()}`;
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
        'Accept': 'application/json',
      };
      
      console.log('[DEBUG] Loading cookies list...');
      console.log('URL:', url);
      const response = await fetch(url, { method: 'GET', headers });
      const text = await response.text();
      console.log('Response:', text);
      
      const data = JSON.parse(text);
      console.log('[DEBUG] Parsed data:', data);
      if (data.raceLocationTimes) {
        console.log('[DEBUG] Cookies found:', data.raceLocationTimes);
        setCookiesList(data.raceLocationTimes);
      } else {
        setCookiesList([]);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei cookie:', error);
      setCookiesList([]);
    } finally {
      setLoadingCookies(false);
    }
  };

  // Funzione di logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire? Dovrai effettuare nuovamente il login.',
      [
        {
          text: 'Annulla',
          style: 'cancel',
        },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            try {
              // Utilizza la funzione del modulo auth per rimuovere i dati
              await clearAuthData();
              
              // Naviga alla start screen
              router.replace('/');
            } catch (error) {
              console.error('Errore durante il logout:', error);
              Alert.alert('Errore', 'Errore durante il logout');
            }
          },
        },
      ]
    );
  };

  if (!parsed || !racer) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText allowFontScaling={false}>Caricamento...</ThemedText>
      </ThemedView>
    );
  }

  const handleSidebarOpen = () => {
    // Logica per aprire la sidebar
    console.log("Apri sidebar");
    Alert.alert("Sidebar", "Funzionalità sidebar in sviluppo.");
  };

  const toggleDrawer = () => {
    const toValue = isDrawerOpen ? 0 : 1;
    setIsDrawerOpen(!isDrawerOpen);
    
    // Se stiamo aprendo il drawer, carica i cookie
    if (!isDrawerOpen) {
      loadCookiesList();
    }
    
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <RaceHeader pilotName={racer.racerfullname} onSidebarPress={handleSidebarOpen} onLogoutPress={handleLogout} />
      
      {/* Welcome Box with Cookie Logic */}
      <View style={[styles.welcomeBox, isSmallScreen && styles.welcomeBoxSmall]}>
          <View style={styles.welcomeContent}>
            {/* Race Name and Timer Row */}
            <View style={styles.raceNameRow}>
              <ThemedText style={[styles.welcomeRace, isSmallScreen && styles.welcomeRaceSmall]} allowFontScaling={false}>{parsed.name}</ThemedText>
              {raceTimer && (
                <View style={[styles.timerContainer, isSmallScreen && styles.timerContainerSmall]}>
                  <ThemedText style={[styles.timerText, isSmallScreen && styles.timerTextSmall]} allowFontScaling={false}>{raceTimer}</ThemedText>
                </View>
              )}
            </View>
            
            <ThemedText style={[styles.welcomeInstruction, isSmallScreen && styles.welcomeInstructionSmall]} allowFontScaling={false}>Inserisci il numero del cookie qui sotto</ThemedText>
            
            {/* Cookie Code Input */}
            <View style={styles.searchBox}>
              <View style={[styles.inputContainer, isSmallScreen && styles.inputContainerSmall]}>
                <Icon name="map-marker" size={isSmallScreen ? 18 : 20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Codice cookie"
                  value={stageCode}
                  onChangeText={(text) => {
                    // Filtra solo i numeri
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setStageCode(numericValue);
                  }}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <TouchableOpacity 
                  style={[styles.searchButton, isSmallScreen && styles.searchButtonSmall]}
                  disabled={searchingStage}
                  onPress={async () => {
                    console.log('[DEBUG] Pulsante ricerca cookie premuto', { stageCode });
                    Keyboard.dismiss(); // Nasconde la tastiera
                    setStageDone(null); // reset stato
                    setSearchingStage(true);
                    setFoundStage(null);
                    setCookieCheckMessage('Ricerca tappa in corso...');
                    // Cerca la tappa e normalizza la struttura address
                    const stage = parsed.raceLocations?.find((loc: any) => String(loc.code) === stageCode);
                    let found = null;
                    if (stage && stage.address && typeof stage.address === 'object') {
                      function dmsToDecimal(val: any) {
                        if (typeof val === 'number') return val;
                        if (typeof val === 'string') {
                          if (/^-?\d+\.\d+$/.test(val.trim())) return parseFloat(val);
                          const dmsMatch = val.match(/(\d+)[°\s]+(\d+)[']?[\s]*(\d+(?:\.\d+)?)["\s]*([NSEW])?/i);
                          if (dmsMatch) {
                            let deg = parseFloat(dmsMatch[1]);
                            let min = parseFloat(dmsMatch[2]);
                            let sec = parseFloat(dmsMatch[3]);
                            let dir = dmsMatch[4];
                            let dec = deg + min/60 + sec/3600;
                            if (dir && (dir.toUpperCase() === 'S' || dir.toUpperCase() === 'W')) dec = -dec;
                            return dec;
                          }
                        }
                        return undefined;
                      }
                      const lat = dmsToDecimal(stage.address.latitude);
                      const lon = dmsToDecimal(stage.address.longitude);
                      found = { ...stage, latitude: lat, longitude: lon };
                    } else {
                      found = stage || null;
                    }
                    setFoundStage(found);
                    console.log('[DEBUG] setFoundStage', found);
                    // Chiamata API per verificare se la tappa è già stata fatta
                    let cookieOk = false;
                    if (found && racer) {
                      try {
                        setCookieCheckMessage('Verifica cookie in corso...');
                        // Nuova chiamata a /Racer per controllare il cookie
                        const paramsRacer = new URLSearchParams({
                          action: 'get',
                          getAction: 'raceLocationDone',
                          id: racer.racerid,
                          clientId: racer.racerclientid,
                          raceLocationCode: found.code,
                        });
                        const urlRacer = `https://crm.1000curve.com/Racer?${paramsRacer.toString()}`;
                        const headers = {
                          'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
                        };
                        console.log('[DEBUG] /Racer CONTROLLO COOKIE');
                        console.log('  URL:', urlRacer);
                        console.log('  HEADERS:', headers);
                        console.log('  PARAMS:', {
                          action: 'get',
                          getAction: 'raceLocationDone',
                          id: racer.racerid,
                          clientId: racer.racerclientid,
                          raceLocationCode: found.code,
                        });
                        const responseRacer = await fetch(urlRacer, { method: 'GET', headers });
                        console.log('  HTTP STATUS:', responseRacer.status, responseRacer.statusText);
                        const textRacer = await responseRacer.text();
                        console.log('  RESPONSE BODY:', textRacer);
                        const trimmed = textRacer.trim();
                        if (trimmed === 'true') {
                          setStageDone(true);
                          setCookieCheckMessage('Cookie trovato!');
                        } else if (trimmed === 'false') {
                          setStageDone(false);
                          setCookieCheckMessage('Cookie non trovato.');
                        } else {
                          setStageDone(null);
                          setCookieCheckMessage('Risposta inattesa: ' + trimmed);
                        }
                      } catch (error) {
                        setStageDone(null);
                        setCookieCheckMessage('Errore nella verifica del cookie.');
                        console.error('Errore nella verifica del cookie:', error);
                      }
                    }
                    setSearchingStage(false);
                    setCookieCheckMessage(null);
                  }}
              >
                <Icon name="chevron-right" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

        {/* Cookie Check Message */}
        {cookieCheckMessage && (
          <View style={styles.checkMessageBox}>
            <ActivityIndicator size="small" color="#0a7ea4" style={{ marginRight: 8 }} />
            <ThemedText allowFontScaling={false}>{cookieCheckMessage}</ThemedText>
          </View>
        )}
        </View>
      </View>

      {/* Found Stage Display - Large name and START button */}
      {foundStage && (
        (() => {
          console.log('[DEBUG] Rendering foundStage', {
            foundStage,
            location,
            latitude: foundStage.latitude,
            longitude: foundStage.longitude,
            stageDone,
            countdown,
            distanza: location && foundStage.latitude != null && foundStage.longitude != null
              ? getDistanceFromLatLonInMeters(
                  location.latitude,
                  location.longitude,
                  Number(foundStage.latitude),
                  Number(foundStage.longitude)
                )
              : null
          });
          return (
            <ScrollView 
              style={styles.foundStageScrollView}
              contentContainerStyle={styles.foundStageContainer}
              showsVerticalScrollIndicator={false}
            >
              <ThemedText style={styles.foundStageName} allowFontScaling={false}>{foundStage.name}</ThemedText>
              {stageDone === true ? (
                <View style={styles.cookieDoneContainer}>
                  <ThemedText style={styles.cookieDoneText} allowFontScaling={false}>Cookie già fatto</ThemedText>
                </View>
              ) : location && foundStage.latitude != null && foundStage.longitude != null ? (
                getDistanceFromLatLonInMeters(
                  location.latitude,
                  location.longitude,
                  Number(foundStage.latitude),
                  Number(foundStage.longitude)
                ) <= 100 ? (
                  searchingStage ? (
                    <ActivityIndicator size="large" color="#0a7ea4" style={{ marginTop: 20 }} />
                  ) : countdown === null ? (
                    <TouchableOpacity 
                      style={[
                        styles.startButton,
                        { backgroundColor: stageDone ? '#28a745' : '#FFD700' }
                      ]}
                      onPress={async () => {
                        // Verifica ancora una volta il cookie prima di iniziare il countdown
                        setSearchingStage(true);
                        setCookieCheckMessage('Verifica finale cookie...');
                        try {
                          const paramsLog = new URLSearchParams({
                            action: 'get',
                            getAction: 'getRacerLocationTime',
                            racerId: racer.racerid,
                            clientId: racer.racerclientid,
                            raceLocationCode: foundStage.code,
                          });
                          const urlLog = `https://crm.1000curve.com/CRMRaceLog?${paramsLog.toString()}`;
                          const headers = {
                            'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
                          };
                          const responseLog = await fetch(urlLog, { method: 'GET', headers, credentials: 'include' });
                          const textLog = await responseLog.text();
                          
                          if (textLog.trim() === 'EXISTS') {
                            setStageDone(true);
                          } else {
                            // Se il cookie non esiste, inizia il countdown
                            setCountdown(60);
                          }
                        } catch (error) {
                          console.error('Errore nella verifica finale del cookie:', error);
                          // Se c'è un errore, permettiamo comunque di procedere
                          setCountdown(60);
                        }
                        setSearchingStage(false);
                        setCookieCheckMessage(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <ThemedText style={[
                        styles.startButtonText,
                        { color: stageDone ? '#fff' : '#022C43' }
                      ]} allowFontScaling={false}>START</ThemedText>
                    </TouchableOpacity>
                  ) : countdown === 0 ? (
                    <View style={styles.goContainer}>
                      <ThemedText style={styles.goText} allowFontScaling={false}>GO</ThemedText>
                    </View>
                  ) : (
                    <View style={styles.countdownContainer}>
                      <ThemedText style={styles.countdownText} allowFontScaling={false}>{countdown}</ThemedText>
                    </View>
                  )
                ) : (
                  <View style={styles.tooFarContainer}>
                    <ThemedText style={styles.tooFarText} allowFontScaling={false}>
                      Sei ancora lontano dal cookie. Recati qui:
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.mapsButton}
                      onPress={() => {
                        const url = `https://www.google.com/maps/search/?api=1&query=${foundStage.latitude},${foundStage.longitude}`;
                        Linking.openURL(url);
                      }}
                      activeOpacity={0.8}
                    >
                      <ThemedText style={styles.mapsButtonText} allowFontScaling={false}>Apri in Google Maps</ThemedText>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <ThemedText style={styles.noCoordinatesText} allowFontScaling={false}>Coordinate tappa non disponibili</ThemedText>
              )}
            </ScrollView>
          );
        })()
      )}

      {/* Bottom Drawer */}
      <Animated.View 
        style={[
          styles.drawer,
          isSmallScreen && styles.drawerSmall,
          {
            height: drawerAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [isSmallScreen ? 140 : 180, screenHeight * 0.8],
            }),
            bottom: drawerAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0],
            }),
          }
        ]}
      >
        <View style={[styles.drawerContent, isSmallScreen && styles.drawerContentSmall]}>
          <TouchableOpacity 
            style={[styles.roadBookButton, isSmallScreen && styles.roadBookButtonSmall]}
            onPress={toggleDrawer}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.roadBookText} allowFontScaling={false}>
              {isDrawerOpen ? 'Chiudi Roadbook' : 'Apri Roadbook'}
            </ThemedText>
          </TouchableOpacity>

          {isDrawerOpen && (
            <View style={styles.drawerBody}>
              {/* Contatore totale curve */}
              {!loadingCookies && (
                <View style={styles.totalCurvesContainer}>
                  <ThemedText style={styles.totalCurvesText} allowFontScaling={false}>
                    Curve completate: {cookiesList.filter(cookie => cookie.done).reduce((total, cookie) => total + (cookie.points || 0), 0)} / {cookiesList.reduce((total, cookie) => total + (cookie.points || 0), 0)}
                  </ThemedText>
                </View>
              )}
              {loadingCookies ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFD700" />
                  <ThemedText style={styles.loadingText} allowFontScaling={false}>Caricamento...</ThemedText>
                </View>
              ) : (
                <ScrollView style={styles.cookiesScrollView} showsVerticalScrollIndicator={false}>
                  {cookiesList.map((cookie, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.cookieItem,
                        { backgroundColor: cookie.done ? '#28a745' : '#FFD700' }
                      ]}
                      onPress={() => {
                        setStageCode(cookie.code);
                        toggleDrawer();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cookieItemContent}>
                        <View style={styles.cookieCodeContainer}>
                          <ThemedText style={[
                            styles.cookieCode,
                            { color: cookie.done ? '#fff' : '#022C43' }
                          ]} allowFontScaling={false}>
                            {cookie.code}
                          </ThemedText>
                        </View>
                        <View style={styles.cookieInfo}>
                          <ThemedText style={[
                            styles.cookieName,
                            { color: cookie.done ? '#fff' : '#022C43' }
                          ]} allowFontScaling={false}>
                            {cookie.name || `Cookie ${cookie.code}`}
                          </ThemedText>
                          <ThemedText style={[
                            styles.cookieDescription,
                            { color: cookie.done ? 'rgba(255,255,255,0.8)' : '#666' }
                          ]} allowFontScaling={false}>
                            {cookie.description || 'Nessuna descrizione disponibile'}
                          </ThemedText>
                          <View style={styles.cookieStatus}>
                            <Icon 
                              name={cookie.done ? "check-circle" : "circle-o"} 
                              size={18} 
                              color={cookie.done ? '#fff' : '#022C43'} 
                            />
                            <ThemedText style={[
                              styles.cookieStatusText,
                              { color: cookie.done ? '#fff' : '#022C43' }
                            ]} allowFontScaling={false}>
                              {cookie.done ? 'Completato' : 'Da fare'}
                            </ThemedText>
                            <ThemedText style={[
                              styles.cookiePoints,
                              { color: cookie.done ? '#fff' : '#022C43' }
                            ]} allowFontScaling={false}>
                              {cookie.points} curve
                            </ThemedText>
                          </View>
                          {cookie.done && cookie.arrivalDate && (
                            <ThemedText style={styles.cookieArrivalDate} allowFontScaling={false}>
                              Completato: {cookie.arrivalDate}
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {cookiesList.length === 0 && (
                    <View style={styles.noCookiesContainer}>
                      <ThemedText style={styles.noCookiesText} allowFontScaling={false}>
                        Nessun cookie disponibile
                      </ThemedText>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    // Rimuovi backgroundColor: 'transparent' se l'header deve coprire tutta la larghezza
    // e non vuoi che il contenuto della ScrollView sia visibile dietro l'header (se trasparente)
  },
  welcomeBox: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 0,
    minHeight: '20%',
    width: '100%',
  },
  welcomeContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'stretch',
  },
  raceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  timerContainer: {
    backgroundColor: '#FFD700',
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 12,
    flexShrink: 0,
  },
  timerContainerSmall: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#022C43',
    textAlign: 'center',
  },
  timerTextSmall: {
    fontSize: 12,
  },
  welcomeGreeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    paddingTop: 30,
    marginBottom: 8,
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  welcomeRace: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'left',
    flex: 1,
  },
  welcomeInstruction: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  garaTitle: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  logo: { // Questo stile potrebbe non essere più necessario o va adattato se usato altrove
    width: 120,
    height: 120,
    marginBottom: 16,
    alignSelf: 'center',
  },
  racerName: { // Questo stile potrebbe non essere più necessario
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    alignSelf: 'center',
  },
  searchBox: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 12,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: '#333',
    borderRadius: 20,
  },
  searchButton: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    paddingLeft: 2,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  checkMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  foundStageScrollView: {
    width: '95%',
    maxWidth: 450,
    alignSelf: 'center',
    marginTop: 32,
    marginBottom: 24,
    maxHeight: 400, // Limita l'altezza per permettere lo scroll
    paddingBottom: 80, // Spazio extra per non coprire il pulsante START
  },
  foundStageContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  foundStageName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#022C43',
    textAlign: 'center',
    marginBottom: 10, // Reduced from 24 to 10
    paddingHorizontal: 12,
    lineHeight: 34,
    flexWrap: 'wrap',
  },
  startButton: {
    width: '85%',
    height: 60,
    borderRadius: 60,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    marginTop: 8,
  },
  startButtonText: {
    color: '#022C43',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cookieDoneContainer: {
    backgroundColor: "#69BA18",
    borderRadius: 30,
    paddingVertical: 20,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  cookieDoneText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  countdownContainer: {
    backgroundColor: '#d00',
    borderRadius: 8,
    paddingVertical: 32,
    paddingHorizontal: 48,
    marginTop: 16,
    marginBottom: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 56,
  },
  goContainer: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 32,
    paddingHorizontal: 48,
    marginTop: 16,
    marginBottom: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 56,
  },
  tooFarContainer: {
    alignItems: 'center',
    marginTop: 8, // Reduced from 16 to 8
  },
  tooFarText: {
    color: '#d00',
    marginBottom: 8, // Reduced from 16 to 8
    textAlign: 'center',
    fontSize: 16,
  },
  mapsButton: {
    backgroundColor: '#FFD700',
    borderRadius: 30,
    paddingVertical: 10, // Reduced from 12 to 10
    paddingHorizontal: 24,
    marginTop: 4, // Add a small top margin
  },
  mapsButtonText: {
    color: '#022C43',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noCoordinatesText: {
    color: '#d00',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#022C43',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    zIndex: 1000,
  },
  drawerContent: {
    flex: 1,
    width: '100%',
    paddingTop: 40,
    paddingHorizontal: 15,
  },
  roadBookButton: {
    width: '85%',
    height: 60,
    borderRadius: 60,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    marginBottom: 10,
  },
  roadBookText: {
    color: '#022C43',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  drawerBody: {
    flex: 1,
    width: '100%',
    paddingTop: 20,
  },
  drawerTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  drawerSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  cookiesScrollView: {
    flex: 1,
    marginTop: 20,
  },
  cookieItem: {
    borderRadius: 15,
    marginBottom: 10,
    padding: 15,
    marginHorizontal: 5,
  },
  cookieItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cookieCodeContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cookieCode: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cookieInfo: {
    flex: 1,
  },
  cookieName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cookieDescription: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 16,
  },
  cookieStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  cookieStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  cookiePoints: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cookieArrivalDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  noCookiesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noCookiesText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  totalCurvesContainer: {
    backgroundColor: '#FFD700',
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  totalCurvesText: {
    color: '#022C43',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Stili per schermi piccoli
  welcomeBoxSmall: {
    padding: 18,
    paddingTop: 24,
    minHeight: '25%',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  welcomeGreetingSmall: {
    fontSize: 24,
    paddingTop: 20,
    marginBottom: 6,
  },
  welcomeRaceSmall: {
    fontSize: 16,
    marginBottom: 12,
  },
  welcomeInstructionSmall: {
    fontSize: 14,
    marginBottom: 18,
  },
  inputContainerSmall: {
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 6,
  },
  searchButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  drawerSmall: {
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  roadBookButtonSmall: {
    height: 50,
    borderRadius: 50,
    marginBottom: 8,
  },
  drawerContentSmall: {
    paddingTop: 30,
    paddingHorizontal: 12,
  },
});
