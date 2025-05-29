import RaceHeader from '@/components/RaceHeader'; // Importa il nuovo componente
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { getDistanceFromLatLonInMeters } from '@/utils/geo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Keyboard, Linking, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
// @ts-ignore

export default function RaceScreen() {
  const { raceData } = useLocalSearchParams();
  const [parsed, setParsed] = useState<any>(null);
  const [racer, setRacer] = useState<any>(null);
  const [stageCode, setStageCode] = useState('');
  const [foundStage, setFoundStage] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stageDone, setStageDone] = useState<boolean | null>(null);

  const [searchingStage, setSearchingStage] = useState(false);
  const [cookieCheckMessage, setCookieCheckMessage] = useState<string | null>(null);
  
  // Drawer state and animation
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const { height: screenHeight } = Dimensions.get('window');

  // RoadBook/Cookie data state
  const [cookiesList, setCookiesList] = useState<any[]>([]);
  const [loadingCookies, setLoadingCookies] = useState(false);

  // Recupera i dati del racer aggiornati (inclusi id, clientId, number, email)
  useEffect(() => {
    AsyncStorage.getItem('racerData').then((data) => {
      if (data) setRacer(JSON.parse(data));
    });
  }, []);

  // Countdown effect: deve stare qui, fuori dal return!
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      // Countdown terminato: invia chiamata a /CRMRaceLog
      (async () => {
        if (!racer || !foundStage) return;
        try {
          console.log('Invio tempo cookie a /CRMRaceLog...');
          // Timestamp in formato intero, senza stringa
          const timestamp = Date.now();
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
            // Mostra conferma, resetta countdown e aggiorna stato tappa fatta
            setCountdown(null);
            // Mostra un messaggio di conferma e, alla chiusura, rilancia la ricerca della tappa
            Alert.alert(
              'Cookie registrato!',
              'Hai completato correttamente la tappa.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Rilancia la ricerca della tappa per aggiornare lo stato
                    if (parsed && stageCode) {
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
                      // Aggiorna stato tappa fatta
                      if (found && racer) {
                        (async () => {
                          try {
                            const params = new URLSearchParams({
                              action: 'get',
                              getAction: 'raceLocationDone',
                              racerId: racer.racerid,
                              clientId: racer.racerclientid,
                              raceLocationCode: found.code,
                            });
                            const url = `https://crm.1000curve.com/Racer?${params.toString()}`;
                            const headers = {
                              'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyW',
                            };
                            const response = await fetch(url, { method: 'GET', headers });
                            const text = await response.text();
                            let done = false;
                            try {
                              const data = text ? JSON.parse(text) : null;
                              done = data === true || data?.done === true;
                            } catch {
                              done = text === 'true';
                            }
                            setStageDone(done);
                          } catch {
                            setStageDone(null);
                          }
                        })();
                      }
                    }
                  },
                },
              ]
            );
            try {
              const paramsDone = new URLSearchParams({
                action: 'get',
                getAction: 'raceLocationDone',
                racerId: racer.racerid,
                clientId: racer.racerclientid,
                raceLocationCode: foundStage.code,
              });
              const urlDone = `https://crm.1000curve.com/Racer?${paramsDone.toString()}`;
              const responseDone = await fetch(urlDone, { method: 'GET', headers });
              const textDone = await responseDone.text();
              let done = false;
              try {
                const data = textDone ? JSON.parse(textDone) : null;
                done = data === true || data?.done === true;
              } catch {
                done = textDone === 'true';
              }
              setStageDone(done);
            } catch (e) {
              setStageDone(null);
            }
          } else if (text.trim() === 'EXISTS') {
            setStageDone(true);
          }
        } catch (e) {
          console.error('Errore invio tempo cookie:', e);
        }
      })();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (typeof c === 'number' && c > 0 ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, racer, foundStage]);
  const { location } = useLiveLocation();

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
      if (data.raceLocationTimes) {
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

  if (!parsed || !racer) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Caricamento...</ThemedText>
      </ThemedView>
    );
  }

  const handleSidebarOpen = () => {
    // Logica per aprire la sidebar
    console.log("Apri sidebar");
    Alert.alert("Sidebar", "Funzionalità sidebar da implementare.");
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
      <RaceHeader pilotName={racer.racerfullname} onSidebarPress={handleSidebarOpen} />
      
      {/* Welcome Box with Cookie Logic */}
      <View style={styles.welcomeBox}>
        <View style={styles.welcomeContent}>
          <ThemedText style={styles.welcomeGreeting}>Ciao {racer.racerfullname}!</ThemedText>
          <ThemedText style={styles.welcomeRace}>Benvenuto alla {parsed.name}</ThemedText>
          <ThemedText style={styles.welcomeInstruction}>Inserisci il codice del cookie qui sotto</ThemedText>
          
          {/* Cookie Code Input */}
          <View style={styles.searchBox}>
            <View style={styles.inputContainer}>
              <Icon name="map-marker" size={20} color="#999" style={styles.inputIcon} />
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
                style={styles.searchButton}
                disabled={searchingStage}
                onPress={async () => {
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
            <ThemedText>{cookieCheckMessage}</ThemedText>
          </View>
        )}
        </View>
      </View>

      {/* Found Stage Display - Large name and START button */}
      {foundStage && (
        <View style={styles.foundStageContainer}>
          <ThemedText style={styles.foundStageName}>{foundStage.name}</ThemedText>
          
          {location && foundStage.latitude != null && foundStage.longitude != null ? (
            getDistanceFromLatLonInMeters(
              location.latitude,
              location.longitude,
              Number(foundStage.latitude),
              Number(foundStage.longitude)
            ) <= 100 ? (
              stageDone === true ? (
                <View style={styles.cookieDoneContainer}>
                  <ThemedText style={styles.cookieDoneText}>Cookie già fatto</ThemedText>
                </View>
              ) : searchingStage ? (
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
                        setCountdown(10);
                      }
                    } catch (error) {
                      console.error('Errore nella verifica finale del cookie:', error);
                      // Se c'è un errore, permettiamo comunque di procedere
                      setCountdown(10);
                    }
                    setSearchingStage(false);
                    setCookieCheckMessage(null);
                  }}
                  activeOpacity={0.8}
                >
                  <ThemedText style={[
                    styles.startButtonText,
                    { color: stageDone ? '#fff' : '#022C43' }
                  ]}>START</ThemedText>
                </TouchableOpacity>
              ) : (
                <View style={styles.countdownContainer}>
                  <ThemedText style={styles.countdownText}>{countdown}</ThemedText>
                </View>
              )
            ) : (
              <View style={styles.tooFarContainer}>
                <ThemedText style={styles.tooFarText}>
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
                  <ThemedText style={styles.mapsButtonText}>Apri in Google Maps</ThemedText>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <ThemedText style={styles.noCoordinatesText}>Coordinate tappa non disponibili</ThemedText>
          )}
        </View>
      )}



      {/* Bottom Drawer */}
      <Animated.View 
        style={[
          styles.drawer,
          {
            height: drawerAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [180, screenHeight * 0.8],
            }),
            bottom: drawerAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0],
            }),
          }
        ]}
      >
        <View style={styles.drawerContent}>
          <TouchableOpacity 
            style={styles.roadBookButton}
            onPress={toggleDrawer}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.roadBookText}>RoadBook</ThemedText>
          </TouchableOpacity>
          
          {isDrawerOpen && (
            <View style={styles.drawerBody}>
              <ThemedText style={styles.drawerTitle}>RoadBook</ThemedText>
              <ThemedText style={styles.drawerSubtitle}>Lista cookie della gara</ThemedText>
              
              {loadingCookies ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFD700" />
                  <ThemedText style={styles.loadingText}>Caricamento...</ThemedText>
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
                        // Inserisci il codice nell'input e chiudi il drawer
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
                          ]}>
                            {cookie.code}
                          </ThemedText>
                        </View>
                        <View style={styles.cookieInfo}>
                          <View style={styles.cookieStatus}>
                            <Icon 
                              name={cookie.done ? "check-circle" : "circle-o"} 
                              size={20} 
                              color={cookie.done ? '#fff' : '#022C43'} 
                            />
                            <ThemedText style={[
                              styles.cookieStatusText,
                              { color: cookie.done ? '#fff' : '#022C43' }
                            ]}>
                              {cookie.done ? 'Completato' : 'Da fare'}
                            </ThemedText>
                          </View>
                          <ThemedText style={[
                            styles.cookiePoints,
                            { color: cookie.done ? '#fff' : '#022C43' }
                          ]}>
                            {cookie.points} punti
                          </ThemedText>
                          {cookie.done && cookie.arrivalDate && (
                            <ThemedText style={styles.cookieArrivalDate}>
                              Completato: {cookie.arrivalDate}
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  {cookiesList.length === 0 && (
                    <View style={styles.noCookiesContainer}>
                      <ThemedText style={styles.noCookiesText}>
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
    minHeight: '30%',
    width: '100%',
  },
  welcomeContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'stretch',
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
    marginBottom: 16,
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  welcomeInstruction: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
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
  foundStageContainer: {
    width: '95%',
    maxWidth: 450,
    alignItems: 'center',
    marginHorizontal: 'auto',
    marginTop: 32,
    marginBottom: 24,
    alignSelf: 'center',
  },
  foundStageName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#022C43',
    textAlign: 'center',
    marginBottom: 24,
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
  tooFarContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  tooFarText: {
    color: '#d00',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  mapsButton: {
    backgroundColor: '#FFD700',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
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
  cookieStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cookieStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cookiePoints: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 3,
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
});
