import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import YellowGradientBackground from '@/components/YellowGradientBackground';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome';

interface UserProfile {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  mobile: string;
  address: {
    country: string;
    zone: string;
    address1: string;
    postalCode: string;
    municipality: string;
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserProfile | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const authData = await getOffRunAuthData();
        if (!authData.isAuthenticated || !authData.userData) {
          router.replace('/');
          return;
        }

        // Chiamata API per recuperare le informazioni complete dell'utente
        const params = new URLSearchParams({
          action: 'get',
          getAction: 'getInfo',
          username: authData.userData.username,
        });
        const url = `https://crm.1000curve.com/RaceUser?${params.toString()}`;
        const headers = {
          'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
        };
        
        console.log('[PROFILE] Caricamento informazioni utente da /RaceUser');
        console.log('URL:', url);
        
        const response = await fetch(url, { method: 'GET', headers });
        const text = await response.text();
        console.log('Response /RaceUser:', text);
        
        const userData = JSON.parse(text);
        setUserInfo(userData);
      } catch (error) {
        console.error('Errore nel caricamento del profilo:', error);
        Alert.alert('Errore', 'Impossibile caricare i dati del profilo');
        router.replace('/off-run');
      } finally {
        setIsLoading(false);
      }
    };
    loadUserProfile();
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

  const handleLogoPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/off-run');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Elimina Account',
      'Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile e tutti i tuoi dati verranno cancellati definitivamente.',
      [
        {
          text: 'Annulla',
          style: 'cancel',
        },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            // Seconda conferma
            Alert.alert(
              'Conferma Eliminazione',
              'Confermi di voler eliminare definitivamente il tuo account?',
              [
                {
                  text: 'No, torna indietro',
                  style: 'cancel',
                },
                {
                  text: 'Sì, elimina',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (!userInfo) return;

                      // Chiamata API per eliminare l'account
                      const params = new URLSearchParams({
                        action: 'unregister',
                        username: userInfo.username,
                      });
                      const url = `https://crm.1000curve.com/RaceUser?${params.toString()}`;
                      const headers = {
                        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
                      };
                      
                      console.log('[PROFILE] Eliminazione account utente');
                      console.log('URL:', url);
                      
                      const response = await fetch(url, { 
                        method: 'POST', 
                        headers
                      });
                      
                      // Leggi la risposta come testo prima di fare il parsing
                      const text = await response.text();
                      console.log('Response Status:', response.status);
                      console.log('Response Text:', text);
                      
                      const data = JSON.parse(text);
                      console.log('Response Parsed:', data);

                      if (response.ok && data.success === 'true') {
                        // Cancella i dati locali
                        await clearOffRunAuthData();
                        Alert.alert(
                          'Account Eliminato',
                          'Il tuo account è stato eliminato con successo',
                          [
                            {
                              text: 'OK',
                              onPress: () => router.replace('/'),
                            },
                          ]
                        );
                      } else {
                        throw new Error('Errore nella risposta del server');
                      }
                    } catch (error) {
                      console.error('Errore durante l\'eliminazione dell\'account:', error);
                      Alert.alert(
                        'Errore',
                        'Si è verificato un errore durante l\'eliminazione dell\'account. Riprova più tardi.'
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <YellowGradientBackground />
        <RaceHeader 
          pilotName={''} 
          onSidebarPress={handleSidebarOpen} 
          onLogoutPress={handleLogout} 
        />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <ThemedText style={styles.loadingText} allowFontScaling={false}>
            Caricamento profilo...
          </ThemedText>
        </View>

        <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
      </View>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <YellowGradientBackground />
      <RaceHeader 
        pilotName={''} 
        onSidebarPress={handleSidebarOpen} 
        onLogoutPress={handleLogout}
        onLogoPress={handleLogoPress}
      />
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        {/* Pulsante indietro */}
        <TouchableOpacity 
          style={[styles.backButton, styles.backButtonWrapper]} 
          onPress={() => { triggerHaptic(); router.replace('/off-run'); }}
        >
          <Icon name="arrow-left" size={16} color="#022C43" />
          <ThemedText style={styles.backButtonText} allowFontScaling={false}>
            Torna alla Home
          </ThemedText>
        </TouchableOpacity>

        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerBox}>
          <View style={styles.avatarContainer}>
            <Icon name="user-circle" size={80} color="#022C43" />
          </View>
          <ThemedText style={styles.nameText} allowFontScaling={false}>
            {userInfo.firstname} {userInfo.lastname}
          </ThemedText>
          <ThemedText style={styles.emailText} allowFontScaling={false}>
            {userInfo.email}
          </ThemedText>
        </Animated.View>

        {/* Sezione Dati Personali */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <ThemedText style={styles.sectionTitle} allowFontScaling={false}>
            Dati Personali
          </ThemedText>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="user" size={18} color="#666" style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel} allowFontScaling={false}>Username</ThemedText>
                <ThemedText style={styles.infoValue} allowFontScaling={false}>{userInfo.username}</ThemedText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Icon name="envelope" size={18} color="#666" style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel} allowFontScaling={false}>Email</ThemedText>
                <ThemedText style={styles.infoValue} allowFontScaling={false}>{userInfo.email}</ThemedText>
              </View>
            </View>

            {userInfo.mobile && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Icon name="phone" size={18} color="#666" style={styles.infoIcon} />
                  <View style={styles.infoContent}>
                    <ThemedText style={styles.infoLabel} allowFontScaling={false}>Telefono</ThemedText>
                    <ThemedText style={styles.infoValue} allowFontScaling={false}>{userInfo.mobile}</ThemedText>
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Sezione Indirizzo */}
        {userInfo.address && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
            <ThemedText style={styles.sectionTitle} allowFontScaling={false}>
              Indirizzo
            </ThemedText>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Icon name="map-marker" size={18} color="#666" style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <ThemedText style={styles.infoLabel} allowFontScaling={false}>Indirizzo</ThemedText>
                  <ThemedText style={styles.infoValue} allowFontScaling={false}>{userInfo.address.address1}</ThemedText>
                </View>
              </View>

              {userInfo.address.municipality && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Icon name="building" size={18} color="#666" style={styles.infoIcon} />
                    <View style={styles.infoContent}>
                      <ThemedText style={styles.infoLabel} allowFontScaling={false}>Città</ThemedText>
                      <ThemedText style={styles.infoValue} allowFontScaling={false}>{userInfo.address.municipality}</ThemedText>
                    </View>
                  </View>
                </>
              )}

              {userInfo.address.postalCode && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Icon name="hashtag" size={18} color="#666" style={styles.infoIcon} />
                    <View style={styles.infoContent}>
                      <ThemedText style={styles.infoLabel} allowFontScaling={false}>CAP</ThemedText>
                      <ThemedText style={styles.infoValue} allowFontScaling={false}>{userInfo.address.postalCode}</ThemedText>
                    </View>
                  </View>
                </>
              )}

              {userInfo.address.zone && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Icon name="map" size={18} color="#666" style={styles.infoIcon} />
                    <View style={styles.infoContent}>
                      <ThemedText style={styles.infoLabel} allowFontScaling={false}>Provincia</ThemedText>
                      <ThemedText style={styles.infoValue} allowFontScaling={false}>{userInfo.address.zone}</ThemedText>
                    </View>
                  </View>
                </>
              )}

              {userInfo.address.country && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Icon name="globe" size={18} color="#666" style={styles.infoIcon} />
                    <View style={styles.infoContent}>
                      <ThemedText style={styles.infoLabel} allowFontScaling={false}>Paese</ThemedText>
                      <ThemedText style={styles.infoValue} allowFontScaling={false}>{userInfo.address.country}</ThemedText>
                    </View>
                  </View>
                </>
              )}
            </View>
          </Animated.View>
        )}

        {/* Pulsante Elimina Account */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.dangerSection}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => { triggerHaptic(); handleDeleteAccount(); }}
          >
            <Icon name="trash" size={20} color="#fff" style={styles.deleteIcon} />
            <ThemedText style={styles.deleteButtonText} allowFontScaling={false}>
              Elimina Account
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.dangerWarning} allowFontScaling={false}>
            Attenzione: questa azione è irreversibile
          </ThemedText>
        </Animated.View>
      </ScrollView>

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
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
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
  headerBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#022C43',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#666',
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
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#022C43',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  dangerSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  deleteIcon: {
    marginRight: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  dangerWarning: {
    fontSize: 12,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
