import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import YellowGradientBackground from '@/components/YellowGradientBackground';
import { CompletedRace, useCompletedRaces } from '@/hooks/useCompletedRaces';
import { getOffRunAuthData } from '@/utils/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function MyRacesScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const { completedRaces, loading } = useCompletedRaces();

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

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
        console.error('Errore nel caricamento dati:', error);
        router.replace('/');
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

  const handleLogoPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/off-run');
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
              await AsyncStorage.removeItem('offRunAuth');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: string, finish: string) => {
    const startDate = new Date(start);
    const finishDate = new Date(finish);
    const diffMs = finishDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  const renderRaceItem = ({ item }: { item: CompletedRace }) => (
    <TouchableOpacity
      style={styles.raceItem}
      onPress={() => { triggerHaptic(); router.push({
        pathname: '/completed-race-details',
        params: {
          raceSlug: item.raceSlug,
          racerId: item.id,
          clientId: item.clientId,
        }
      }); }}
    >
      <View style={styles.raceIcon}>
        <Icon name="trophy" size={30} color="#FFD700" />
      </View>
      <View style={styles.raceInfo}>
        <ThemedText style={styles.raceName} allowFontScaling={false}>
          {item.raceName || item.raceSlug}
        </ThemedText>
        <View style={styles.datesContainer}>
          <ThemedText style={styles.raceDates} allowFontScaling={false}>
            Dal {formatDate(item.startDate)} al {formatDate(item.finishDate)}
          </ThemedText>
        </View>
        <ThemedText style={styles.raceDuration} allowFontScaling={false}>
          Durata: {calculateDuration(item.startDate, item.finishDate)}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  if (!userInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <YellowGradientBackground />
        <RaceHeader 
          pilotName={''} 
          onSidebarPress={handleSidebarOpen} 
          onLogoutPress={handleLogout} 
        />
        
        <View style={styles.contentContainer}>
          {/* Pulsante indietro */}
          <TouchableOpacity style={[styles.backButton, styles.backButtonWrapper]} onPress={() => { triggerHaptic(); router.replace('/off-run'); }}>
            <Icon name="arrow-left" size={16} color="#022C43" />
            <ThemedText style={styles.backButtonText} allowFontScaling={false}>
              Torna alla Home
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.title} allowFontScaling={false}>
            Le Mie Gare
          </ThemedText>
          
          <View style={styles.emptyContainer}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
            <ThemedText style={styles.emptyText} allowFontScaling={false}>
              Caricamento...
            </ThemedText>
          </View>
        </View>

        <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <YellowGradientBackground />
      <RaceHeader 
        pilotName={userInfo.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''} 
        onSidebarPress={handleSidebarOpen} 
        onLogoutPress={handleLogout}
        onLogoPress={handleLogoPress}
      />
      
      <View style={styles.contentContainer}>
        {/* Pulsante indietro */}
        <TouchableOpacity style={[styles.backButton, styles.backButtonWrapper]} onPress={() => router.replace('/off-run')}>
          <Icon name="arrow-left" size={16} color="#022C43" />
          <ThemedText style={styles.backButtonText} allowFontScaling={false}>
            Torna alla Home
          </ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.title} allowFontScaling={false}>
          Le Mie Gare
        </ThemedText>
        
        {completedRaces.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Icon name="trophy" size={48} color="#ccc" />
            <ThemedText style={styles.emptyText} allowFontScaling={false}>
              Nessuna gara disponibile
            </ThemedText>
          </View>
        ) : loading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
            <ThemedText style={styles.emptyText} allowFontScaling={false}>
              Caricamento...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={completedRaces}
            keyExtractor={(item, index) => `${item.raceSlug}-${index}`}
            renderItem={renderRaceItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#022C43',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  raceItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  raceIcon: {
    marginRight: 16,
    justifyContent: 'center',
  },
  raceInfo: {
    flex: 1,
  },
  datesContainer: {
    marginBottom: 8,
  },
  raceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#022C43',
    marginBottom: 8,
  },
  raceDates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  raceDuration: {
    fontSize: 14,
    color: '#022C43',
    fontWeight: '600',
  },
  loadingSpinner: {
    borderRadius: 50,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
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
  backButtonWrapper: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#022C43',
    marginLeft: 6,
  },
});