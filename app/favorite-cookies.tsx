import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import YellowGradientBackground from '@/components/YellowGradientBackground';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface FavoriteCookie {
  raceSlug: string;
  raceName: string;
  code: string;
  name: string;
  description: string;
  points: number;
  pointsName: string;
  address: {
    latitude: number;
    longitude: number;
  };
}

const FAVORITES_KEY = 'favorite_cookies';

export default function FavoriteCookiesScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteCookie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const authData = await getOffRunAuthData();
        if (authData.isAuthenticated && authData.userData) {
          setUserInfo(authData.userData);
          await loadFavorites();
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
  }, [router]);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored);
        setFavorites(parsedFavorites);
      }
    } catch (error) {
      console.error('Errore nel caricamento preferiti:', error);
    }
  };

  const removeFavorite = async (raceSlug: string, code: string) => {
    try {
      const updatedFavorites = favorites.filter(fav => !(fav.raceSlug === raceSlug && fav.code === code));
      setFavorites(updatedFavorites);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Errore nella rimozione del preferito:', error);
      Alert.alert('Errore', 'Impossibile rimuovere il cookie dai preferiti');
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

  if (!userInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <YellowGradientBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <ThemedText style={styles.loadingText} allowFontScaling={false}>
            Caricamento...
          </ThemedText>
        </View>
      </View>
    );
  }

  if (loading) {
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <ThemedText style={styles.loadingText} allowFontScaling={false}>
            Caricamento cookie preferiti...
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Icon name="arrow-left" size={16} color="#022C43" />
            <ThemedText style={styles.backButtonText} allowFontScaling={false}>
              Torna indietro
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Lista preferiti */}
        {favorites.length > 0 ? (
          favorites.map((favorite, index) => (
            <TouchableOpacity 
              key={`${favorite.raceSlug}-${favorite.code}`} 
              style={styles.favoriteCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/race-details',
                  params: { raceSlug: favorite.raceSlug }
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.favoriteHeader}>
                <View style={styles.locationCode}>
                  <ThemedText style={styles.locationCodeText} allowFontScaling={false}>
                    {favorite.code}
                  </ThemedText>
                </View>
                <View style={styles.favoriteInfo}>
                  <ThemedText style={styles.favoriteName} allowFontScaling={false}>
                    {favorite.name}
                  </ThemedText>
                  <ThemedText style={styles.favoriteRace} allowFontScaling={false}>
                    {favorite.raceName}
                  </ThemedText>
                  <ThemedText style={styles.favoritePoints} allowFontScaling={false}>
                    {favorite.points} {favorite.pointsName || 'punti'}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeFavorite(favorite.raceSlug, favorite.code);
                  }}
                >
                  <Icon name="heart" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
              {favorite.description && (
                <ThemedText style={styles.favoriteDescription} allowFontScaling={false}>
                  {favorite.description}
                </ThemedText>
              )}
              {favorite.address && (
                <View style={styles.favoriteCoords}>
                  <Icon name="map-marker" size={12} color="#666" />
                  <ThemedText style={styles.coordsText} allowFontScaling={false}>
                    {favorite.address.latitude?.toFixed(6) || 'N/A'}, {favorite.address.longitude?.toFixed(6) || 'N/A'}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="heart-o" size={48} color="#ccc" />
            <ThemedText style={styles.emptyText} allowFontScaling={false}>
              Nessun cookie nei preferiti
            </ThemedText>
            <ThemedText style={styles.emptySubtext} allowFontScaling={false}>
              Aggiungi cookie ai preferiti dalle pagine dei dettagli delle gare
            </ThemedText>
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#022C43',
    marginLeft: 16,
  },
  favoriteCard: {
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
  favoriteHeader: {
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
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#022C43',
  },
  favoriteRace: {
    fontSize: 14,
    color: '#666',
  },
  favoritePoints: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  favoriteDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  favoriteCoords: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});