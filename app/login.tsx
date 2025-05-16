import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useThemeColor } from '@/hooks/useThemeColor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { location, enabled, errorMsg } = useLiveLocation();
  const iconColor = useThemeColor({}, 'tint');

  const handleLogin = async () => {
    if (!enabled) {
      Alert.alert('Geolocalizzazione richiesta', 'Attiva la geolocalizzazione per effettuare il login.');
      return;
    }
    // Qualunque cosa venga inserita, restituisce il JSON richiesto
    const result = {
      racerfullname: 'Mirco Ceccarini',
      racerid: '1059',
      racerclientid: 'zCqIBwZVVHqaeswAlspefYZoKCLucN',
      raceslug: '1000curve-app',
    };
    try {
      // Salva il JSON localmente
      await AsyncStorage.setItem('racerData', JSON.stringify(result));

      // Effettua la chiamata API (GET)
      const params = new URLSearchParams({
        action: 'get',
        getAction: 'getRace',
        slug: result.raceslug,
      });
      const url = `https://crm.1000curve.com/Race?${params.toString()}`;
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      };
      console.log('Chiamata API:', { url, method: 'GET', headers });
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      let data;
      let text = await response.text();
      console.log('Risposta API (raw):', text);
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseError) {
        console.error('Errore di parsing JSON:', parseError, 'Risposta ricevuta:', text);
        data = { error: 'Risposta non in formato JSON', raw: text };
      }
      console.log('Risposta API (parsed):', data);
      // Naviga alla pagina race passando i dati della gara come parametro
      router.replace({
        pathname: '/race',
        params: {
          raceData: encodeURIComponent(JSON.stringify(data)),
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
