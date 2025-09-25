import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface StartLocation {
  latitude: number;
  longitude: number;
}

export default function StartRaceScreen() {
  const params = useLocalSearchParams();
  const raceSlug = params.raceSlug as string;
  const raceName = params.raceName as string;
  const startLocation = params.startLocation ? JSON.parse(params.startLocation as string) : null;
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Hook per la geolocalizzazione
  const { location, errorMsg: locationError } = useLiveLocation();

  console.log('StartRace params:', { raceSlug, raceName, startLocation });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const authData = await getOffRunAuthData();
        if (authData.isAuthenticated && authData.userData) {
          setUserInfo(authData.userData);
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Errore nel caricamento dati utente:', error);
        router.replace('/');
      }
    };
    loadUserData();
  }, [router]);

  // Calcola la distanza quando cambia la posizione
  useEffect(() => {
    if (location && startLocation) {
      const userLat = location.latitude;
      const userLng = location.longitude;
      const startLat = startLocation.latitude;
      const startLng = startLocation.longitude;

      // Calcola la distanza usando la formula di Haversine (distanza in metri)
      const R = 6371000; // Raggio della Terra in metri
      const dLat = (startLat - userLat) * Math.PI / 180;
      const dLng = (startLng - userLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(startLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const calculatedDistance = R * c;

      setDistance(calculatedDistance);
      setCanStart(calculatedDistance <= 50); // 50 metri

      console.log('Distance calculated:', calculatedDistance, 'meters, canStart:', calculatedDistance <= 50);
    }
  }, [location, startLocation]);

  const handleSidebarOpen = () => {
    setIsSidebarVisible(true);
  };

  const handleSidebarClose = () => {
    setIsSidebarVisible(false);
  };

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
              await clearOffRunAuthData();
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

  const handleOpenMaps = () => {
    if (startLocation) {
      const { latitude, longitude } = startLocation;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };

  const handleStartRace = async () => {
    if (!canStart) return;

    try {
      // Mostra loading
      setIsStarting(true);

      const authData = await getOffRunAuthData();
      if (!authData.isAuthenticated || !authData.userData) {
        Alert.alert('Errore', 'Dati utente non disponibili');
        return;
      }

      // Fetch race data to get START location
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      };
      const paramsRace = new URLSearchParams({
        action: 'get',
        getAction: 'getRace',
        slug: raceSlug,
      });
      const urlRace = `https://crm.1000curve.com/Race?${paramsRace.toString()}`;
      const responseRace = await fetch(urlRace, { method: 'GET', headers });
      const textRace = await responseRace.text();
      // Log curl per Postman
      const curlCommandRace = `curl -X GET "${urlRace}" -H "Api-Key: uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW"`;
      console.log('CURL per Postman (dati gara per START):', curlCommandRace);
      let raceData = null;
      try {
        raceData = textRace ? JSON.parse(textRace) : null;
      } catch (e) {
        console.error('Errore parsing JSON /Race:', e, textRace);
      }
      const startLocationFromRace = raceData?.raceLocations?.find((loc: any) => loc.name?.toUpperCase().includes('START') || loc.code?.toUpperCase().includes('START'));

      // Chiamata API per iniziare la sessione
      const params = new URLSearchParams({
        action: 'set',
        setAction: 'startRaceSession',
        email: authData.userData.email,
        raceSlug: raceSlug,
      });

      const url = `https://crm.1000curve.com/Racer?${params.toString()}`;
      console.log('API URL:', url);
      // Log curl per Postman
      const curlCommandSession = `curl -X GET "${url}" -H "Api-Key: uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW"`;
      console.log('CURL per Postman (avvio sessione):', curlCommandSession);
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
        },
      });
      console.log('Response status:', response.status);
      console.log('Response redirected:', response.redirected);
      console.log('Response url:', response.url);
      console.log('Response content-type:', response.headers.get('content-type'));
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      const text = await response.text();
      console.log('Response text:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        throw new Error('Risposta API non valida');
      }

      if (data && data.clientId) {
        // Salva id, clientId, data e ora corrente in AsyncStorage
        const sessionData = {
          id: data.id,
          clientId: data.clientId,
          startDate: new Date().toISOString(),
          raceSlug: raceSlug,
        };
        await AsyncStorage.setItem('raceSession', JSON.stringify(sessionData));

        // Registra il cookie START
        if (startLocationFromRace) {
          const timestamp = Math.floor(Date.now() / 1000);
          const netState = await NetInfo.fetch();
          if (netState.isConnected) {
            const paramsSet = new URLSearchParams({
              action: 'set',
              setAction: 'setRacerLocationTime',
              racerId: data.id,
              racerClientId: data.clientId,
              raceLocationCode: startLocationFromRace.code,
              timestamp: String(timestamp),
            });
            const urlSet = `https://crm.1000curve.com/CRMRaceLog?${paramsSet.toString()}`;
            const headersSet = {
              'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
              'Accept': '*/*',
              'Accept-Language': 'it',
              'Referer': 'https://crm.1000curve.com/app/race.html',
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            };
            try {
              const responseSet = await fetch(urlSet, { method: 'GET', headers: headersSet, credentials: 'include' });
              const textSet = await responseSet.text();
              console.log('Risposta registrazione START:', textSet);
              // Log curl per Postman
              const curlCommand = `curl -X GET "${urlSet}" -H "Api-Key: uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW" -H "Accept: */*" -H "Accept-Language: it" -H "Referer: https://crm.1000curve.com/app/race.html" -H "X-Requested-With: XMLHttpRequest" -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36" --include`;
              console.log('CURL per Postman (registrazione START):', curlCommand);
            } catch (error) {
              console.error('Errore registrazione START:', error);
              // Non bloccare, continua
            }
          } else {
            // Offline, non registrare per ora
          }
        }

        // Naviga a gara-off-run
        router.push({ pathname: '/gara-off-run' as any });
      } else {
        Alert.alert('Errore', 'Impossibile iniziare la gara. Riprova.');
      }
    } catch (error) {
      console.error('Errore nell\'iniziare la gara:', error);
      Alert.alert('Errore', 'Errore di connessione. Riprova.');
    } finally {
      setIsStarting(false);
    }
  };

  if (!userInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <RaceHeader
          pilotName={userInfo?.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''}
          onSidebarPress={handleSidebarOpen}
          onLogoutPress={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <ThemedText style={styles.loadingText} allowFontScaling={false}>
            Caricamento...
          </ThemedText>
        </View>
        <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
      </View>
    );
  }

  if (!startLocation) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <RaceHeader
          pilotName={userInfo.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''}
          onSidebarPress={handleSidebarOpen}
          onLogoutPress={handleLogout}
        />
        <View style={styles.errorContainer}>
          <Icon name="exclamation-triangle" size={48} color="#ccc" />
          <ThemedText style={styles.errorText} allowFontScaling={false}>
            Coordinate del punto di partenza non disponibili
          </ThemedText>
        </View>
        <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <RaceHeader
        pilotName={userInfo.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''}
        onSidebarPress={handleSidebarOpen}
        onLogoutPress={handleLogout}
      />

      <View style={styles.contentContainer}>
        {/* Pulsante indietro */}
        <TouchableOpacity style={[styles.backButton, { position: 'absolute', top: 20, left: 20 }]} onPress={() => router.back()}>
          <Icon name="arrow-left" size={16} color="#022C43" />
          <ThemedText style={styles.backButtonText} allowFontScaling={false}>
            Dettagli gara
          </ThemedText>
        </TouchableOpacity>

        {/* Blocco centrato */}
        <View style={styles.centeredBlock}>
          {/* Box istruzioni in alto */}
          <View style={styles.instructionCard}>
            <Icon name="map-marker" size={48} color="#FFD700" />
            <ThemedText style={styles.instructionTitle} allowFontScaling={false}>
              Recati al punto di partenza (START) per iniziare la gara
            </ThemedText>

            {location && (
              <View style={styles.locationInfo}>
                <ThemedText style={styles.distanceText} allowFontScaling={false}>
                  Distanza attuale: {distance !== null ? `${Math.round(distance)} metri` : 'Calcolo...'}
                </ThemedText>

                {locationError && (
                  <ThemedText style={styles.errorText} allowFontScaling={false}>
                    Errore GPS: {locationError}
                  </ThemedText>
                )}
              </View>
            )}

            {!location && !locationError && (
              <View style={styles.loadingLocation}>
                <ActivityIndicator size="small" color="#FFD700" />
                <ThemedText style={styles.loadingLocationText} allowFontScaling={false}>
                  Rilevamento posizione GPS...
                </ThemedText>
              </View>
            )}
          </View>

          {/* Pulsante Vai a Mappe */}
          <TouchableOpacity style={styles.mapsButton} onPress={handleOpenMaps}>
            <Icon name="map" size={20} color="#022C43" />
            <ThemedText style={styles.mapsButtonText} allowFontScaling={false}>
              Vai a Mappe
            </ThemedText>
          </TouchableOpacity>

          {/* Pulsante START sempre visibile */}
          <TouchableOpacity
            style={[styles.startRaceButton, !canStart && styles.startRaceButtonDisabled]}
            onPress={handleStartRace}
            disabled={!canStart || isStarting}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color={canStart ? "#022C43" : "#999"} />
            ) : (
              <>
                <Icon name="play" size={24} color={canStart ? "#022C43" : "#999"} />
                <ThemedText style={[styles.startRaceButtonText, !canStart && styles.startRaceButtonTextDisabled]} allowFontScaling={false}>
                  START
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 16,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centeredBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#022C43',
    marginLeft: 6,
  },
  instructionCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#022C43',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  locationInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  distanceText: {
    fontSize: 24,
    color: '#022C43',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  loadingLocationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  mapsButton: {
    backgroundColor: '#FFD700',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 200,
    marginBottom: 20,
  },
  mapsButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#022C43',
    marginLeft: 8,
  },
  startRaceButton: {
    backgroundColor: '#FFD700',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 200,
  },
  startRaceButtonDisabled: {
    backgroundColor: '#cccccc',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  startRaceButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#022C43',
    marginLeft: 8,
  },
  startRaceButtonTextDisabled: {
    color: '#999',
  },
});