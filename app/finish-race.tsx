import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface FinishLocation {
  latitude: number;
  longitude: number;
}

export default function FinishRaceScreen() {
  const params = useLocalSearchParams();
  const raceSlug = params.raceSlug as string;
  const raceName = params.raceName as string;
  const finishLocation = params.finishLocation ? JSON.parse(params.finishLocation as string) : null;
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [canFinish, setCanFinish] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Hook per la geolocalizzazione
  const { location, errorMsg: locationError } = useLiveLocation();

  console.log('FinishRace params:', { raceSlug, raceName, finishLocation });

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
    if (location && finishLocation) {
      const userLat = location.latitude;
      const userLng = location.longitude;
      const finishLat = finishLocation.latitude;
      const finishLng = finishLocation.longitude;

      // Calcola la distanza usando la formula di Haversine (distanza in metri)
      const R = 6371000; // Raggio della Terra in metri
      const dLat = (finishLat - userLat) * Math.PI / 180;
      const dLng = (finishLng - userLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(finishLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const calculatedDistance = R * c;

      setDistance(calculatedDistance);
      setCanFinish(calculatedDistance <= 50); // 50 metri

      console.log('Distance calculated:', calculatedDistance, 'meters, canFinish:', calculatedDistance <= 50);
    }
  }, [location, finishLocation]);

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
              await AsyncStorage.removeItem('raceSession');
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
    if (finishLocation) {
      const { latitude, longitude } = finishLocation;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };

  const handleFinishRace = async () => {
    if (!canFinish) return;

    try {
      setIsFinishing(true);

      // Aggiorna la sessione con la data di fine
      const sessionString = await AsyncStorage.getItem('raceSession');
      if (sessionString) {
        const session = JSON.parse(sessionString);
        session.finishDate = new Date().toISOString();
        await AsyncStorage.setItem('raceSession', JSON.stringify(session));

        // Aggiungi alla lista delle gare completate
        const completedString = await AsyncStorage.getItem('completedRaces');
        let completed = completedString ? JSON.parse(completedString) : [];
        completed.push(session);
        await AsyncStorage.setItem('completedRaces', JSON.stringify(completed));
      }

      // Pulisci AsyncStorage mantenendo solo i dati utente e le gare completate
      const keysToRemove = ['raceSession', 'pendingCookies', 'raceData'];
      await AsyncStorage.multiRemove(keysToRemove);

      // Mostra messaggio di successo
      Alert.alert('Gara completata!', 'Complimenti! Hai finito la gara.', [
        {
          text: 'OK',
          onPress: () => {
            // Torna alla home off-run
            router.replace('/off-run');
          },
        },
      ]);
    } catch (error) {
      console.error('Errore nel completare la gara:', error);
      Alert.alert('Errore', 'Errore durante il completamento. Riprova.');
    } finally {
      setIsFinishing(false);
    }
  };

  if (!userInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false }} />
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

  if (!finishLocation) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <RaceHeader
          pilotName={userInfo.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''}
          onSidebarPress={handleSidebarOpen}
          onLogoutPress={handleLogout}
        />
        <View style={styles.errorContainer}>
          <Icon name="exclamation-triangle" size={48} color="#ccc" />
          <ThemedText style={styles.errorText} allowFontScaling={false}>
            Coordinate del punto di arrivo non disponibili
          </ThemedText>
        </View>
        <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Stack.Screen options={{ headerShown: false }} />
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
            Gara Off-Run
          </ThemedText>
        </TouchableOpacity>

        {/* Blocco centrato */}
        <View style={styles.centeredBlock}>
          {/* Box istruzioni in alto */}
          <View style={styles.instructionCard}>
            <Icon name="flag-checkered" size={48} color="#FFD700" />
            <ThemedText style={styles.instructionTitle} allowFontScaling={false}>
              Recati al punto di arrivo (FINISH) per completare la gara
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

          {/* Pulsante FINISH sempre visibile */}
          <TouchableOpacity
            style={[styles.finishRaceButton, !canFinish && styles.finishRaceButtonDisabled]}
            onPress={handleFinishRace}
            disabled={!canFinish || isFinishing}
          >
            {isFinishing ? (
              <ActivityIndicator size="small" color={canFinish ? "#022C43" : "#999"} />
            ) : (
              <>
                <Icon name="flag" size={24} color={canFinish ? "#022C43" : "#999"} />
                <ThemedText style={[styles.finishRaceButtonText, !canFinish && styles.finishRaceButtonTextDisabled]} allowFontScaling={false}>
                  FINISH
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
  finishRaceButton: {
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
  finishRaceButtonDisabled: {
    backgroundColor: '#cccccc',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  finishRaceButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#022C43',
    marginLeft: 8,
  },
  finishRaceButtonTextDisabled: {
    color: '#999',
  },
});