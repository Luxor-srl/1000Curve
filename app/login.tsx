import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useThemeColor } from '@/hooks/useThemeColor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [todayRace, setTodayRace] = useState<any>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const router = useRouter();
  const { location, enabled, errorMsg } = useLiveLocation();
  const iconColor = useThemeColor({}, 'tint');

  // Recupera la gara di oggi all'avvio
  React.useEffect(() => {
    const fetchTodayRace = async () => {
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
          // Trova la gara di oggi
          // Cerca la gara che ha la data di inizio esattamente oggi (ignorando l'orario)
          const today = new Date();
          const found = data.races.find((race: any) => {
            const start = new Date(race.startDateGmtDate);
            return (
              start.getFullYear() === today.getFullYear() &&
              start.getMonth() === today.getMonth() &&
              start.getDate() === today.getDate()
            );
          });
          setTodayRace(found || null);
        } else {
          setTodayRace(null);
        }
      } catch (e) {
        setTodayRace(null);
      }
      setLoadingRace(false);
    };
    fetchTodayRace();
  }, []);

  const handleLogin = async () => {
    if (!enabled) {
      Alert.alert('Geolocalizzazione richiesta', 'Attiva la geolocalizzazione per effettuare il login.');
      return;
    }
    if (!todayRace) {
      Alert.alert('Errore', 'Nessuna gara disponibile oggi.');
      return;
    }
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
        Alert.alert('Errore', 'Impossibile avviare la sessione di gara.');
        return;
      }
      // Salva i dati del racer per uso futuro
      const racerData = {
        racerid: dataRacer.id,
        number: dataRacer.number,
        racerclientid: dataRacer.clientId,
        raceslug: raceSlug,
        email,
      };
      await AsyncStorage.setItem('racerData', JSON.stringify(racerData));

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
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Login</ThemedText>
      <View style={styles.geoBox}>
        <IconSymbol
          name={enabled ? 'paperplane.fill' : 'paperplane.fill'}
          size={32}
          color={enabled ? iconColor : '#ccc'}
          style={{ marginRight: 8 }}
        />
        <View>
          {enabled ? (
            <ThemedText style={{ fontSize: 14 }}>
              Geolocalizzazione attiva
              {location && `\nLat: ${location.latitude.toFixed(5)}, Lon: ${location.longitude.toFixed(5)}`}
            </ThemedText>
          ) : (
            <ThemedText style={{ fontSize: 14, color: '#d00' }}>
              Geolocalizzazione non attiva
            </ThemedText>
          )}
          {errorMsg && <ThemedText style={{ color: '#d00', fontSize: 12 }}>{errorMsg}</ThemedText>}
        </View>
        {!enabled && <ActivityIndicator size="small" color={iconColor} style={{ marginLeft: 8 }} />}
      </View>
      {/* Campo gara di oggi */}
      <TextInput
        style={[styles.input, { backgroundColor: '#eee', color: '#888' }]}
        placeholder="Gara di oggi"
        value={loadingRace ? 'Caricamento...' : (todayRace ? todayRace.name : 'Nessuna gara oggi')}
        editable={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Numero pettorale"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} disabled={!enabled} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 32,
  },
  geoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    minWidth: 220,
    maxWidth: 340,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
});
