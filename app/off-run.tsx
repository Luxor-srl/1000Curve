import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import YellowGradientBackground from '@/components/YellowGradientBackground';
import { useCompletedRaces } from '@/hooks/useCompletedRaces';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width } = Dimensions.get('window');

export default function OffRunScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { totalCurves, totalRaces, lastRace, loading: loadingSummary } = useCompletedRaces();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const authData = await getOffRunAuthData();
        if (authData.isAuthenticated && authData.userData) {
          // Chiamata API per recuperare le informazioni complete dell'utente
          try {
            const params = new URLSearchParams({
              action: 'get',
              getAction: 'getInfo',
              username: authData.userData.username,
            });
            const url = `https://crm.1000curve.com/RaceUser?${params.toString()}`;
            const headers = {
              'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
            };
            
            console.log('[DEBUG] Caricamento informazioni utente da /RaceUser');
            console.log('URL:', url);
            
            const response = await fetch(url, { method: 'GET', headers });
            const text = await response.text();
            console.log('Response /RaceUser:', text);
            
            const userData = JSON.parse(text);
            if (userData.firstname && userData.lastname) {
              // Aggiorna i dati utente con nome e cognome completi
              setUserInfo({
                ...authData.userData,
                firstname: userData.firstname,
                lastname: userData.lastname,
              });
            } else {
              setUserInfo(authData.userData);
            }
          } catch (apiError) {
            console.error('Errore nel recupero informazioni utente da API:', apiError);
            // In caso di errore, usa i dati cached
            setUserInfo(authData.userData);
          }

          // Controlla se c'è una gara Off-Run attiva
          const sessionString = await AsyncStorage.getItem('raceSession');
          if (sessionString) {
            const session = JSON.parse(sessionString);
            // Se non ha finishDate, significa che è attiva
            if (!session.finishDate) {
              router.replace('/gara-off-run');
              return;
            }
          }
        } else {
          // Se non ci sono dati utente, torna al login
          router.replace('/');
          return;
        }
      } catch (error) {
        console.error('Errore nel caricamento dati utente:', error);
        router.replace('/');
        return;
      } finally {
        setIsCheckingSession(false);
      }
    };
    loadUserData();
  }, []);

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

  if (!userInfo || isCheckingSession) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <ThemedText style={styles.loadingText} allowFontScaling={false}>
            Caricamento...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <YellowGradientBackground />
      <RaceHeader 
        pilotName="" 
        onSidebarPress={handleSidebarOpen} 
        onLogoutPress={handleLogout} 
      />
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        <Animated.View entering={FadeInUp.delay(200)} style={styles.welcomeBox}>
          <ThemedText style={styles.welcomeText} allowFontScaling={false}>
            Ciao {userInfo.firstname} 👋
          </ThemedText>
          <ThemedText style={styles.subtitleText} allowFontScaling={false}>
            Ecco il tuo riepilogo Off-Run
          </ThemedText>
        </Animated.View>

        {loadingSummary ? (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.loadingSummaryBox}>
            <ActivityIndicator size="large" color="#FFD700" />
            <ThemedText style={styles.loadingSummaryText} allowFontScaling={false}>Caricamento riepilogo...</ThemedText>
          </Animated.View>
        ) : (
          <>
            {/* Statistiche principali */}
            <Animated.View entering={FadeInDown.delay(400)} style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Icon name="trophy" size={24} color="#022C43" />
                  <ThemedText style={styles.statValue} allowFontScaling={false}>{totalRaces}</ThemedText>
                  <ThemedText style={styles.statLabel} allowFontScaling={false}>Gare completate</ThemedText>
                </View>
                <View style={styles.statCard}>
                  <Icon name="road" size={24} color="#022C43" />
                  <ThemedText style={styles.statValue} allowFontScaling={false}>{totalCurves}</ThemedText>
                  <ThemedText style={styles.statLabel} allowFontScaling={false}>Curve totali</ThemedText>
                </View>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push('/races')}
                >
                  <Icon name="play-circle" size={24} color="#fff" />
                  <ThemedText style={styles.actionButtonText} allowFontScaling={false}>Nuova Gara</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButtonSecondary}
                  onPress={() => router.push('/my-races')}
                >
                  <Icon name="history" size={24} color="#022C43" />
                  <ThemedText style={styles.actionButtonTextSecondary} allowFontScaling={false}>Riepilogo Gare</ThemedText>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Ultima gara */}
            <Animated.View entering={FadeInDown.delay(600)} style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle} allowFontScaling={false}>Ultima Gara</ThemedText>
              <View style={styles.lastRaceCard}>
                {lastRace ? (
                  <>
                    <View style={styles.raceHeader}>
                      <Icon name="flag-checkered" size={20} color="#022C43" />
                      <ThemedText style={styles.raceName} allowFontScaling={false}>{lastRace.name}</ThemedText>
                    </View>
                    <View style={styles.raceDetails}>
                      <ThemedText style={styles.raceDate} allowFontScaling={false}>
                        {new Date(lastRace.finishDate || lastRace.startDate || '').toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </ThemedText>
                      <ThemedText style={styles.raceCurves} allowFontScaling={false}>
                        {lastRace.curves} {lastRace.pointsName || 'curve'}
                      </ThemedText>
                    </View>
                    {lastRace.slug && lastRace.racerId && lastRace.clientId && (
                      <TouchableOpacity 
                        style={styles.detailsButton} 
                        onPress={() => router.push({ 
                          pathname: '/completed-race-details', 
                          params: { raceSlug: lastRace.slug, racerId: lastRace.racerId, clientId: lastRace.clientId } 
                        })}
                      >
                        <ThemedText style={styles.detailsButtonText} allowFontScaling={false}>Vedi dettagli</ThemedText>
                        <Icon name="chevron-right" size={12} color="#022C43" />
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Icon name="flag-o" size={32} color="#ccc" />
                    <ThemedText style={styles.emptyText} allowFontScaling={false}>Nessuna gara completata</ThemedText>
                  </View>
                )}
              </View>
            </Animated.View>

          </>
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
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  welcomeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#022C43',
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  loadingSummaryBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingSummaryText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#022C43',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#022C43',
    marginBottom: 16,
  },
  lastRaceCard: {
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
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  raceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#022C43',
    marginLeft: 12,
  },
  raceDetails: {
    marginBottom: 16,
  },
  raceDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  raceCurves: {
    fontSize: 16,
    fontWeight: '600',
    color: '#022C43',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  detailsButtonText: {
    color: '#022C43',
    fontWeight: '600',
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#022C43',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  actionButtonTextSecondary: {
    color: '#022C43',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
});