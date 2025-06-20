import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useThemeColor } from '@/hooks/useThemeColor';
import { RacerData, saveAuthData } from '@/utils/auth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
// Import the necessary icons
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [todayRace, setTodayRace] = useState<any>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const { location, enabled, errorMsg } = useLiveLocation();

  // Stampa in console le coordinate ogni volta che cambiano
  React.useEffect(() => {
    if (location) {
      const timestamp = new Date().toLocaleTimeString();
      const deviceName = Device.deviceName || 'Dispositivo sconosciuto';
      console.log(`[${timestamp}] ${deviceName} - Coordinate attuali:`, location.latitude, location.longitude);
    }
  }, [location]);
  const iconColor = useThemeColor({}, 'tint');

  // Recupera tutte le gare disponibili all'avvio
  React.useEffect(() => {
    const fetchRaces = async () => {
      setLoadingRace(true);
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      };
      const params = new URLSearchParams({
        action: 'get',
        getAction: 'getRaces',
      });
      const url = `https://crm.1000curve.com/Race?${params.toString()}`;
      try {
        const res = await fetch(url, { method: 'GET', headers });
        const data = await res.json();
        if (data && Array.isArray(data.races)) {
          // Logga tutte le tappe con le date di inizio
          console.log('Lista tappe e date di inizio:');
          data.races.forEach((race: any) => {
            console.log(`- ${race.name} (${race.slug}): ${race.startDateDisplayTimestamp}`);
          });
          // Trova la gara di oggi ESATTAMENTE
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const found = data.races.find((race: any) => {
            const start = new Date(race.startDateGmtDate);
            start.setHours(0, 0, 0, 0);
            return start.getTime() === today.getTime();
          });
          
          console.log('Gara di oggi trovata:', found ? found.name : 'Nessuna gara oggi');
          setTodayRace(found || null);
        } else {
          setTodayRace(null);
        }
      } catch (e) {
        console.error('Errore nel caricamento gare:', e);
        setTodayRace(null);
      }
      setLoadingRace(false);
    };
    fetchRaces();
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return; // Previene doppi click
    
    if (!enabled) {
      Alert.alert('Geolocalizzazione richiesta', 'Attiva la geolocalizzazione per effettuare il login.');
      return;
    }
    if (!todayRace) {
      Alert.alert('Errore', 'Nessuna gara disponibile oggi. Controlla che ci sia una gara in programma per oggi.');
      return;
    }
    
    setIsLoggingIn(true);
    
    const email = username;
    const number = password;
    const raceSlug = todayRace.slug;
    try {
      // Chiamata dummy a CRMRaceLog per inizializzare la sessione
      try {
        const dummyParams = new URLSearchParams({
          action: 'get',
          getAction: 'getRacerLocationTime',
          racerId: '0',
          clientId: '0',
          raceLocationCode: 'dummy',
        });
        const dummyUrl = `https://crm.1000curve.com/CRMRaceLog?${dummyParams.toString()}`;
        const dummyHeaders = {
          'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
        };
        await fetch(dummyUrl, { method: 'GET', headers: dummyHeaders, credentials: 'include' });
        console.log('Chiamata dummy CRMRaceLog eseguita');
      } catch (e) {
        console.warn('Chiamata dummy CRMRaceLog fallita', e);
      }
      // 1. Chiamata a /Racer per startRaceSession
      const paramsRacer = new URLSearchParams({
        action: 'set',
        setAction: 'startRaceSession',
        email,
        number,
        raceSlug,
      });
      const urlRacer = `https://crm.1000curve.com/Racer?${paramsRacer.toString()}`;
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      };
      console.log('Chiamata API /Racer:', { urlRacer, method: 'GET', headers });
      const responseRacer = await fetch(urlRacer, { method: 'GET', headers });
      let textRacer = await responseRacer.text();
      let dataRacer;
      try {
        dataRacer = textRacer ? JSON.parse(textRacer) : null;
      } catch (parseError) {
        console.error('Errore di parsing JSON /Racer:', parseError, 'Risposta ricevuta:', textRacer);
        dataRacer = { error: 'Risposta non in formato JSON', raw: textRacer };
      }
      if (!dataRacer || !dataRacer.id || !dataRacer.clientId) {
        Alert.alert('Errore', 'Email o numero pettorale non validi. Verifica i dati inseriti.');
        return;
      }
      // Salva i dati del racer per uso futuro
      const racerData: RacerData = {
        racerid: dataRacer.id,
        number: dataRacer.number,
        racerclientid: dataRacer.clientId,
        raceslug: raceSlug,
        email,
      };

      // 2. Chiamata a /Race per ottenere i dati della gara
      const paramsRace = new URLSearchParams({
        action: 'get',
        getAction: 'getRace',
        slug: raceSlug,
      });
      const urlRace = `https://crm.1000curve.com/Race?${paramsRace.toString()}`;
      console.log('Chiamata API /Race:', { urlRace, method: 'GET', headers });
      const responseRace = await fetch(urlRace, { method: 'GET', headers });
      let textRace = await responseRace.text();
      let dataRace;
      try {
        dataRace = textRace ? JSON.parse(textRace) : null;
      } catch (parseError) {
        console.error('Errore di parsing JSON /Race:', parseError, 'Risposta ricevuta:', textRace);
        dataRace = { error: 'Risposta non in formato JSON', raw: textRace };
      }

      // Salva i dati di autenticazione
      await saveAuthData(racerData, dataRace);

      // Naviga alla pagina race passando i dati della gara come parametro
      router.replace({
        pathname: '/race',
        params: {
          raceData: encodeURIComponent(JSON.stringify(dataRace)),
        },
      });
    } catch (error) {
      // Stampa il motivo dell'errore in console
      console.error('Errore durante la chiamata API:', error);
      Alert.alert('Errore', 'Errore durante il login o la chiamata API.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Immagine in alto */}
      <View style={styles.topImageContainer}>
        <Image
          source={require('../assets/images/1000curve-login.jpg')}
          style={styles.topImage}
          resizeMode="cover"
        />
      </View>
      {/* Drawer in basso */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.drawerContainer}
      >
        {/* Riquadro arrotondato con scritta */}
        <TouchableOpacity style={styles.roundedBox} activeOpacity={0.85}>
          <ThemedText style={styles.roundedBoxText} allowFontScaling={false}>Partecipa alla gara</ThemedText>
        </TouchableOpacity>
        {/* Input e info gara */}
        <View style={styles.inputsContainer}>
          <View style={styles.inputWrapper}>
            <View style={styles.letterIcon}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#888" />
            </View>
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Email"
              placeholderTextColor="#888"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>
          <View style={styles.inputWrapper}>
            <View style={styles.letterIcon}>
              <FontAwesome name="id-card-o" size={18} color="#888" />
            </View>
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Numero pettorale"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>
          <ThemedText style={styles.raceNameText} allowFontScaling={false}>
            {loadingRace ? 'Caricamento gara...' : (todayRace ? todayRace.name : 'Nessuna gara oggi')}
          </ThemedText>
        </View>
        {/* Pulsante Accedi */}
        <TouchableOpacity
          style={[styles.loginButton, (!enabled || isLoggingIn) && { opacity: 0.5 }]}
          onPress={handleLogin}
          disabled={!enabled || isLoggingIn}
        >
          <ThemedText style={styles.loginButtonText} allowFontScaling={false}>
            {isLoggingIn ? 'Accesso in corso...' : 'Accedi'}
          </ThemedText>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  topImageContainer: {
    width: '100%',
    height: '45%',
    minHeight: 220,
    maxHeight: 400,
    overflow: 'hidden',
    position: 'relative',
  },
  topImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawerContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f8f8',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    minHeight: '65%',
    maxHeight: '75%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  roundedBox: {
    backgroundColor: '#FFD700',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  roundedBoxText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    letterSpacing: 0.5,
  },
  inputsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  letterIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  letterIconText: {
    fontSize: 18,
    color: '#888',
    fontWeight: '700',
  },
  inputWithIcon: {
    flex: 1,
    height: 54,
    fontSize: 18,
    color: '#222',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
  },
  raceNameText: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
    marginBottom: 0,
    textAlign: 'center',
  },
  loginButton: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FBBA00',
    paddingVertical: 26,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 12,
    overflow: 'visible',
  },
  loginButtonText: {
    color: '#111',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
