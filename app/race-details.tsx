import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import YellowGradientBackground from '@/components/YellowGradientBackground';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface RaceLocation {
  order: number;
  code: string;
  name: string;
  description: string;
  points: number;
  address: {
    latitude: number;
    longitude: number;
  };
}

interface RaceLocationCombo {
  name: string;
  points: number;
  raceLocations: RaceLocation[];
}

interface RaceDetails {
  name: string;
  slug: string;
  info: string;
  pointsName: string;
  roadbookUrl: string;
  note: string;
  offRunDurationLimitHours: number;
  offRunStartAddress: {
    latitude: number;
    longitude: number;
  };
  offRunFinishAddress: {
    latitude: number;
    longitude: number;
  };
  raceLocations: RaceLocation[];
  raceLocationCombos: RaceLocationCombo[];
}

const FAVORITES_KEY = 'favorite_cookies';

export default function RaceDetailsScreen() {
  const params = useLocalSearchParams();
  const raceSlug = params.raceSlug as string;
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [raceDetails, setRaceDetails] = useState<RaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Verifica se abbiamo il parametro raceSlug
    if (!raceSlug) {
      console.error('Parametro raceSlug mancante, reindirizzamento...');
      router.replace('/races');
      return;
    }

    const loadUserData = async () => {
      try {
        const authData = await getOffRunAuthData();
        if (authData.isAuthenticated && authData.userData) {
          setUserInfo(authData.userData);
          // Carica i dettagli della gara dopo aver verificato l'autenticazione
          await loadRaceDetails();
          await loadFavorites();
        } else {
          // Se non ci sono dati utente, torna al login
          router.replace('/');
        }
      } catch (error) {
        console.error('Errore nel caricamento dati utente:', error);
        router.replace('/');
      }
    };
    loadUserData();
  }, [raceSlug, router]);

  const loadRaceDetails = async () => {
    if (!raceSlug) return;

    try {
      setLoading(true);
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      };
      const params = new URLSearchParams({
        action: 'get',
        getAction: 'getRace',
        slug: raceSlug as string,
      });
      const url = `https://crm.1000curve.com/Race?${params.toString()}`;

      console.log('Caricamento dettagli gara:', url);
      const response = await fetch(url, { method: 'GET', headers });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data && typeof data === 'object') {
        // Verifica che abbiamo almeno le proprietà essenziali
        if (data.name && data.slug) {
          setRaceDetails(data);
          console.log('Dettagli gara caricati:', data.name);
        } else {
          console.warn('Risposta API incompleta:', data);
          Alert.alert('Errore', 'I dati della gara ricevuti sono incompleti. Riprova più tardi.');
          router.back();
        }
      } else {
        console.warn('Risposta API non valida:', data);
        Alert.alert('Errore', 'Impossibile caricare i dettagli della gara. Riprova più tardi.');
        router.back();
      }
    } catch (error) {
      console.error('Errore nel caricamento dettagli gara:', error);
      Alert.alert('Errore', 'Impossibile caricare i dettagli della gara');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsedFavorites: any[] = JSON.parse(stored);
        const favoriteKeys = new Set(parsedFavorites.map((fav) => `${fav.raceSlug}-${fav.code}`));
        setFavorites(favoriteKeys);
      }
    } catch (error) {
      console.error('Errore nel caricamento preferiti:', error);
    }
  };

  const toggleFavorite = async (location: RaceLocation) => {
    if (!raceDetails) return;

    const key = `${raceDetails.slug}-${location.code}`;
    const isFavorite = favorites.has(key);

    try {
      let updatedFavorites: any[] = [];
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        updatedFavorites = JSON.parse(stored);
      }

      if (isFavorite) {
        // Rimuovi dai preferiti
        updatedFavorites = updatedFavorites.filter(fav => !(fav.raceSlug === raceDetails.slug && fav.code === location.code));
        const newFavorites = new Set(favorites);
        newFavorites.delete(key);
        setFavorites(newFavorites);
      } else {
        // Aggiungi ai preferiti
        const favoriteItem = {
          raceSlug: raceDetails.slug,
          raceName: raceDetails.name,
          code: location.code,
          name: location.name,
          description: location.description,
          points: location.points,
          pointsName: raceDetails.pointsName,
          address: location.address,
        };
        updatedFavorites.push(favoriteItem);
        const newFavorites = new Set(favorites);
        newFavorites.add(key);
        setFavorites(newFavorites);
        // Vibrazione quando si aggiunge ai preferiti
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Errore nel toggle preferito:', error);
      Alert.alert('Errore', 'Impossibile aggiornare i preferiti');
    }
  };

  const handleLogoPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/off-run');
  };

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

  const openRoadbook = () => {
    if (raceDetails?.roadbookUrl) {
      router.push({
        pathname: '/roadbook',
        params: {
          roadbookUrl: raceDetails.roadbookUrl,
          raceName: raceDetails.name
        }
      });
    }
  };

  if (!userInfo) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText allowFontScaling={false}>Caricamento...</ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <RaceHeader
          pilotName={userInfo.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''}
          onSidebarPress={handleSidebarOpen}
          onLogoutPress={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <ThemedText style={styles.loadingText} allowFontScaling={false}>
            Caricamento dettagli gara...
          </ThemedText>
        </View>
        <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
      </View>
    );
  }

  if (!raceDetails) {
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
            Dettagli gara non disponibili
          </ThemedText>
        </View>
        <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <YellowGradientBackground />
      <RaceHeader
        pilotName={userInfo.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''}
        onSidebarPress={handleSidebarOpen}
        onLogoutPress={handleLogout}
        onLogoPress={handleLogoPress}
      />

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Pulsanti header */}
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Icon name="arrow-left" size={16} color="#022C43" />
            <ThemedText style={styles.backButtonText} allowFontScaling={false}>
              Torna alla lista
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.startButton} onPress={() => {
            router.push({
              pathname: '/start-race',
              params: {
                raceSlug: raceDetails.slug,
                raceName: raceDetails.name,
                startLocation: JSON.stringify(raceDetails.offRunStartAddress)
              }
            });
          }}>
            <ThemedText style={styles.startButtonText} allowFontScaling={false}>
              Inizia la gara
            </ThemedText>
            <Icon name="play" size={16} color="#022C43" />
          </TouchableOpacity>
        </View>

        {/* Header della gara */}
        <View style={styles.raceHeader}>
          <ThemedText style={styles.raceName} allowFontScaling={false}>
            {raceDetails.name || 'Gara senza nome'}
          </ThemedText>
        </View>

        {/* Informazioni Off-Run */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} allowFontScaling={false}>
            Off-Run
          </ThemedText>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="clock-o" size={16} color="#666" />
              <ThemedText style={styles.infoText} allowFontScaling={false}>
                Durata limite: {raceDetails.offRunDurationLimitHours || 'N/A'} ore
              </ThemedText>
            </View>
            {raceDetails.offRunStartAddress && (
              <View style={styles.infoRow}>
                <Icon name="map-marker" size={16} color="#666" />
                <ThemedText style={styles.infoText} allowFontScaling={false}>
                  Partenza: {raceDetails.offRunStartAddress.latitude?.toFixed(6) || 'N/A'}, {raceDetails.offRunStartAddress.longitude?.toFixed(6) || 'N/A'}
                </ThemedText>
              </View>
            )}
            {raceDetails.offRunFinishAddress && (
              <View style={styles.infoRow}>
                <Icon name="flag" size={16} color="#666" />
                <ThemedText style={styles.infoText} allowFontScaling={false}>
                  Arrivo: {raceDetails.offRunFinishAddress.latitude?.toFixed(6) || 'N/A'}, {raceDetails.offRunFinishAddress.longitude?.toFixed(6) || 'N/A'}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Roadbook */}
        {raceDetails.roadbookUrl && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.roadbookButton} onPress={openRoadbook}>
              <Icon name="file-pdf-o" size={20} color="#022C43" />
              <ThemedText style={styles.roadbookText} allowFontScaling={false}>
                Visualizza Roadbook
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Tappe della gara */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle} allowFontScaling={false}>
              Tappe ({raceDetails.raceLocations?.filter(loc => loc.code !== 'START' && loc.code !== 'FINISH').length || 0})
            </ThemedText>
            {raceDetails.raceLocations?.some(loc => loc.address?.latitude && loc.address?.longitude) && (
              <TouchableOpacity
                style={styles.mapToggleButton}
                onPress={() => router.push({
                  pathname: '/race-map',
                  params: {
                    raceSlug: raceDetails.slug,
                    raceName: raceDetails.name,
                    pointsName: raceDetails.pointsName,
                    raceLocations: JSON.stringify(raceDetails.raceLocations)
                  }
                })}
              >
                <Icon name="map" size={16} color="#022C43" />
                <ThemedText style={styles.mapToggleText} allowFontScaling={false}>
                  Apri mappa
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {raceDetails.raceLocations?.filter(loc => loc.code !== 'START' && loc.code !== 'FINISH').map((location) => (
            <View key={location.code} style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <View style={styles.locationCode}>
                  <ThemedText style={styles.locationCodeText} allowFontScaling={false}>
                    {location.code}
                  </ThemedText>
                </View>
                <View style={styles.locationInfo}>
                  <ThemedText style={styles.locationName} allowFontScaling={false}>
                    {location.name}
                  </ThemedText>
                  <ThemedText style={styles.locationPoints} allowFontScaling={false}>
                    {location.points} {raceDetails.pointsName || 'punti'}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => toggleFavorite(location)}
                >
                  <Icon
                    name={favorites.has(`${raceDetails.slug}-${location.code}`) ? "heart" : "heart-o"}
                    size={20}
                    color={favorites.has(`${raceDetails.slug}-${location.code}`) ? "#F44336" : "#666"}
                  />
                </TouchableOpacity>
              </View>
              {location.description && (
                <ThemedText style={styles.locationDescription} allowFontScaling={false}>
                  {location.description}
                </ThemedText>
              )}
              {location.address && (
                <View style={styles.locationCoords}>
                  <Icon name="map-marker" size={12} color="#666" />
                  <ThemedText style={styles.coordsText} allowFontScaling={false}>
                    {location.address.latitude?.toFixed(6) || 'N/A'}, {location.address.longitude?.toFixed(6) || 'N/A'}
                  </ThemedText>
                </View>
              )}
            </View>
          )) || (
            <View style={styles.emptySection}>
              <ThemedText style={styles.emptyText} allowFontScaling={false}>
                Nessuna tappa disponibile
              </ThemedText>
            </View>
          )}
        </View>

        {/* Combo delle tappe */}
        {raceDetails.raceLocationCombos && raceDetails.raceLocationCombos.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} allowFontScaling={false}>
              Combo ({raceDetails.raceLocationCombos.length})
            </ThemedText>
            {raceDetails.raceLocationCombos.map((combo, index) => (
              <View key={index} style={styles.comboCard}>
                <View style={styles.comboHeader}>
                  <ThemedText style={styles.comboName} allowFontScaling={false}>
                    {combo.name}
                  </ThemedText>
                  <ThemedText style={styles.comboPoints} allowFontScaling={false}>
                    {combo.points} {raceDetails.pointsName || 'punti'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.comboLocations} allowFontScaling={false}>
                  {combo.raceLocations?.map(loc => loc.name).join(' → ') || 'N/A'}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Note aggiuntive */}
        {raceDetails.note && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} allowFontScaling={false}>
              Note
            </ThemedText>
            <View style={styles.noteCard}>
              <ThemedText style={styles.noteText} allowFontScaling={false}>
                {raceDetails.note}
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>

      <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    paddingTop: 20,
  },
  raceHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  raceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#022C43',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#022C43',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  roadbookButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roadbookText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#022C43',
    marginLeft: 8,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationCode: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#022C43',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#022C43',
  },
  locationPoints: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  locationCoords: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  comboCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  comboHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  comboName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#022C43',
  },
  comboPoints: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  comboLocations: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
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
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#022C43',
    marginRight: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptySection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  mapToggleText: {
    fontSize: 12,
    color: '#022C43',
    marginLeft: 4,
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 8,
  },
});