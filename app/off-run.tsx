import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

export default function OffRunScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const authData = await getOffRunAuthData();
        if (authData.isAuthenticated && authData.userData) {
          setUserInfo(authData.userData);
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
      <ThemedView style={styles.container}>
        <ThemedText allowFontScaling={false}>Caricamento...</ThemedText>
      </ThemedView>
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
        <ThemedText style={styles.contentText} allowFontScaling={false}>
          Contenuti e funzionalità Off-Run
        </ThemedText>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
});