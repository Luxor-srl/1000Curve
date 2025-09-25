import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import YellowGradientBackground from '@/components/YellowGradientBackground';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
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

interface RacerLocationTime {
  code: string;
  name: string;
  description: string;
  address: {
    latitude: number;
    longitude: number;
    address1: string;
    postcode: string;
    cityTownVillage: string;
    municipality?: string;
    country: string;
    zone?: string;
  };
  done: boolean;
  points: number;
  arrivalDate?: string;
  arrivalDateDisplayTimestamp?: string;
  arrivalDateTimestamp?: number;
  arrivalDateGmtDate?: string;
  arrivalDateGmtInternetDate?: string;
}

export default function CompletedRaceDetailsScreen() {
  const params = useLocalSearchParams();
  const raceSlug = params.raceSlug as string;
  const racerId = params.racerId as string;
  const clientId = params.clientId as string;
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [raceDetails, setRaceDetails] = useState<RaceDetails | null>(null);
  const [racerLocationTimes, setRacerLocationTimes] = useState<RacerLocationTime[]>([]);
  const [loading, setLoading] = useState(true);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  useEffect(() => {
    if (!raceSlug || !racerId || !clientId) {
      console.error('Parametri mancanti, reindirizzamento...');
      router.replace('/my-races');
      return;
    }

    const loadUserData = async () => {
      try {
        const authData = await getOffRunAuthData();
        if (authData.isAuthenticated && authData.userData) {
          setUserInfo(authData.userData);
          // Carica dettagli gara e tempi in parallelo
          await Promise.all([loadRaceDetails(), loadRacerLocationTimes()]);
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Errore nel caricamento dati utente:', error);
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, [raceSlug, racerId, clientId, router]);

  const loadRaceDetails = async () => {
    if (!raceSlug) return;

    try {
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      };
      const params = new URLSearchParams({
        action: 'get',
        getAction: 'getRace',
        slug: raceSlug,
      });
      const url = `https://crm.1000curve.com/Race?${params.toString()}`;

      console.log('Caricamento dettagli gara:', url);
      const response = await fetch(url, { method: 'GET', headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && typeof data === 'object') {
        if (data.name && data.slug) {
          setRaceDetails(data);
          console.log('Dettagli gara caricati:', data.name);
        } else {
          console.warn('Risposta API incompleta:', data);
          Alert.alert('Errore', 'I dati della gara ricevuti sono incompleti.');
          router.back();
        }
      } else {
        console.warn('Risposta API non valida:', data);
        Alert.alert('Errore', 'Impossibile caricare i dettagli della gara.');
        router.back();
      }
    } catch (error) {
      console.error('Errore nel caricamento dettagli gara:', error);
      Alert.alert('Errore', 'Impossibile caricare i dettagli della gara');
      router.back();
    }
  };

  const loadRacerLocationTimes = async () => {
    if (!racerId || !clientId) return;

    try {
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      };
      const params = new URLSearchParams({
        action: 'get',
        getAction: 'getRacerLocationTimes',
        format: 'json',
        id: racerId,
        clientId: clientId,
      });
      const url = `https://crm.1000curve.com/Racer?${params.toString()}`;

      console.log('Caricamento tempi racer:', url);
      const response = await fetch(url, { method: 'GET', headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.raceLocationTimes) {
        setRacerLocationTimes(data.raceLocationTimes);
        console.log('Tempi racer caricati');
      } else {
        console.warn('Risposta API tempi racer non valida:', data);
      }
    } catch (error) {
      console.error('Errore nel caricamento tempi racer:', error);
      Alert.alert('Errore', 'Impossibile caricare i tempi della gara');
    }
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

  const getLocationTime = (code: string) => {
    return racerLocationTimes.find(loc => loc.code === code);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <YellowGradientBackground />
        <RaceHeader
          pilotName={userInfo?.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''}
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
        <YellowGradientBackground />
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
      />

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Pulsanti header */}
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.backButton} onPress={() => { triggerHaptic(); router.back(); }}>
            <Icon name="arrow-left" size={16} color="#022C43" />
            <ThemedText style={styles.backButtonText} allowFontScaling={false}>
              Torna alle mie gare
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Header della gara */}
        <View style={styles.raceHeader}>
          <ThemedText style={styles.raceName} allowFontScaling={false}>
            {raceDetails.name || 'Gara senza nome'}
          </ThemedText>
          <ThemedText style={styles.completedText} allowFontScaling={false}>
            Gara Completata
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
            <TouchableOpacity style={styles.roadbookButton} onPress={() => { triggerHaptic(); openRoadbook(); }}>
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
                onPress={() => { triggerHaptic(); router.push({
                  pathname: '/race-map',
                  params: {
                    raceSlug: raceDetails.slug,
                    raceName: raceDetails.name,
                    pointsName: raceDetails.pointsName,
                    raceLocations: JSON.stringify(raceDetails.raceLocations),
                    racerLocationTimes: JSON.stringify(racerLocationTimes),
                  }
                }); }}
              >
                <Icon name="map" size={16} color="#022C43" />
                <ThemedText style={styles.mapToggleText} allowFontScaling={false}>
                  Apri mappa
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {raceDetails.raceLocations?.filter(loc => loc.code !== 'START' && loc.code !== 'FINISH').map((location) => {
            const racerTime = getLocationTime(location.code);
            return (
              <View key={location.code} style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <View style={[styles.locationCode, racerTime?.done ? styles.locationCodeDone : {}]}>
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
                {racerTime?.done && racerTime.arrivalDate && (
                  <View style={styles.arrivalTime}>
                    <Icon name="check-circle" size={14} color="#4CAF50" />
                    <ThemedText style={styles.arrivalText} allowFontScaling={false}>
                      Arrivato: {racerTime.arrivalDate}
                    </ThemedText>
                  </View>
                )}
                {!racerTime?.done && (
                  <View style={styles.notDone}>
                    <Icon name="times-circle" size={14} color="#F44336" />
                    <ThemedText style={styles.notDoneText} allowFontScaling={false}>
                      Non completato
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          }) || (
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  raceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#022C43',
    textAlign: 'center',
  },
  completedText: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
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
  locationCodeDone: {
    backgroundColor: '#4CAF50',
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
  arrivalTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  arrivalText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '600',
  },
  notDone: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  notDoneText: {
    fontSize: 14,
    color: '#F44336',
    marginLeft: 6,
    fontWeight: '600',
  },
  comboCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
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
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
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
});