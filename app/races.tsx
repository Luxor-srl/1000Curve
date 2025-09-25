import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import YellowGradientBackground from '@/components/YellowGradientBackground';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface Race {
  name: string;
  slug: string;
  startDate: string;
  startDateTimestamp: number;
  startDateGmtDate: string;
  startDateGmtInternetDate: string;
  startDateDisplayTimestamp: string;
  finishDate: string;
  finishDateTimestamp: number;
  finishDateGmtDate: string;
  finishDateGmtInternetDate: string;
  finishDateDisplayTimestamp: string;
  roadbookUrl: string;
  pointsName: string;
  info: string;
  note: string;
}

export default function RacesScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const authData = await getOffRunAuthData();
        if (authData.isAuthenticated && authData.userData) {
          setUserInfo(authData.userData);
          // Carica le gare dopo aver verificato l'autenticazione
          await loadRaces();
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
  }, []);

  const loadRaces = async () => {
    try {
      setLoading(true);
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      };
      const params = new URLSearchParams({
        action: 'get',
        getAction: 'getRaces',
      });
      const url = `https://crm.1000curve.com/Race?${params.toString()}`;

      console.log('Caricamento lista gare:', url);
      const response = await fetch(url, { method: 'GET', headers });
      const data = await response.json();

      if (data && Array.isArray(data.races)) {
        setRaces(data.races);
        console.log('Gare caricate:', data.races.length);
      } else {
        setRaces([]);
        console.warn('Risposta API non valida:', data);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle gare:', error);
      Alert.alert('Errore', 'Impossibile caricare la lista delle gare');
      setRaces([]);
    } finally {
      setLoading(false);
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

  const renderRaceItem = ({ item }: { item: Race }) => (
    <TouchableOpacity
      style={styles.raceItem}
      activeOpacity={0.7}
      onPress={() => {
        router.push({
          pathname: '/race-details',
          params: { raceSlug: item.slug }
        });
      }}
    >
      <View style={styles.raceItemContent}>
        <View style={styles.raceHeader}>
          <ThemedText style={styles.raceName} allowFontScaling={false}>
            {item.name}
          </ThemedText>
        </View>

        <View style={styles.raceDetails}>
          {item.roadbookUrl && (
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={0.7}
              onPress={() => {
                router.push({
                  pathname: '/roadbook',
                  params: {
                    roadbookUrl: item.roadbookUrl,
                    raceName: item.name
                  }
                });
              }}
            >
              <Icon name="file-pdf-o" size={12} color="#FFD700" />
              <ThemedText style={styles.detailText} allowFontScaling={false}>
                Roadbook disponibile
              </ThemedText>
              <Icon name="chevron-right" size={10} color="#022C43" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}

          <View style={styles.tapIndicator}>
            <Icon name="chevron-right" size={14} color="#022C43" />
            <ThemedText style={styles.tapText} allowFontScaling={false}>
              Tocca per dettagli
            </ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!userInfo) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText allowFontScaling={false}>Caricamento...</ThemedText>
      </ThemedView>
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

      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <ThemedText style={styles.title} allowFontScaling={false}>
            Lista delle Gare
          </ThemedText>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadRaces}
            disabled={loading}
          >
            <Icon name="refresh" size={16} color={loading ? "#ccc" : "#022C43"} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <ThemedText style={styles.loadingText} allowFontScaling={false}>
              Caricamento gare...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={races}
            keyExtractor={(item) => item.slug}
            renderItem={renderRaceItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="calendar-times-o" size={48} color="#ccc" />
                <ThemedText style={styles.emptyText} allowFontScaling={false}>
                  Nessuna gara disponibile
                </ThemedText>
              </View>
            }
          />
        )}
      </View>

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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#022C43',
  },
  refreshButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#FFD700',
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
  listContainer: {
    paddingBottom: 20,
  },
  raceItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  raceItemContent: {
    padding: 16,
  },
  raceHeader: {
    marginBottom: 4,
  },
  raceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#022C43',
  },
  raceDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 16,
    textAlign: 'center',
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  tapText: {
    fontSize: 12,
    color: '#022C43',
    marginLeft: 6,
    fontWeight: '600',
  },
});