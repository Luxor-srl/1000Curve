import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
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

  const handleStartRace = () => {
    // Qui puoi aggiungere la logica per iniziare effettivamente la gara
    console.log('Starting race:', raceSlug);
    Alert.alert('Gara iniziata!', 'Buona fortuna! 🚀');
    // Puoi navigare a una pagina di gara attiva o timer
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

  if (!startLocation) {
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
            Coordinate del punto di partenza non disponibili
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
            disabled={!canStart}
          >
            <Icon name="play" size={24} color={canStart ? "#022C43" : "#999"} />
            <ThemedText style={[styles.startRaceButtonText, !canStart && styles.startRaceButtonTextDisabled]} allowFontScaling={false}>
              START
            </ThemedText>
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