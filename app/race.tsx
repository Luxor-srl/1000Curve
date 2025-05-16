import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { getDistanceFromLatLonInMeters } from '@/utils/geo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Image, Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
// @ts-ignore

export default function RaceScreen() {
  const { raceData } = useLocalSearchParams();
  const [parsed, setParsed] = useState<any>(null);
  const [racer, setRacer] = useState<any>(null);
  const [stageCode, setStageCode] = useState('');
  const [foundStage, setFoundStage] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stageDone, setStageDone] = useState<boolean | null>(null);
  const [cookieTableRows, setCookieTableRows] = useState<any[] | null>(null);
  const [cookieTableHeaders, setCookieTableHeaders] = useState<string[] | null>(null);

  // Countdown effect: deve stare qui, fuori dal return!
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      // Countdown terminato: invia chiamata a /CRMRaceLog
      (async () => {
        if (!racer || !foundStage) return;
        try {
          console.log('Invio tempo cookie a /CRMRaceLog...');
          // Timestamp in formato intero, senza stringa
          const timestamp = Date.now();
          const params = new URLSearchParams({
            action: 'set',
            setAction: 'setRacerLocationTime',
            racerId: racer.racerid, // fix: use racerId (not racerid)
            clientId: racer.racerclientid,
            raceLocationCode: foundStage.code,
            timestamp: String(timestamp),
          });
          const url = `https://crm.1000curve.com/CRMRaceLog?${params.toString()}`;
          const headers = {
            'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
            'Accept': '*/*',
            'Accept-Language': 'it',
            'Referer': 'https://crm.1000curve.com/app/race.html',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          };
          const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
          const text = await response.text();
          console.log('Risposta /CRMRaceLog:', text);
          if (text.trim() === 'SUCCESS') {
            // Aggiorna stato tappa fatta
            try {
              const paramsDone = new URLSearchParams({
                action: 'get',
                getAction: 'raceLocationDone',
                racerId: racer.racerid,
                clientId: racer.racerclientid,
                raceLocationCode: foundStage.code,
              });
              const urlDone = `https://crm.1000curve.com/Racer?${paramsDone.toString()}`;
              const responseDone = await fetch(urlDone, { method: 'GET', headers });
              const textDone = await responseDone.text();
              let done = false;
              try {
                const data = textDone ? JSON.parse(textDone) : null;
                done = data === true || data?.done === true;
              } catch {
                done = textDone === 'true';
              }
              setStageDone(done);
            } catch (e) {
              setStageDone(null);
            }
          } else if (text.trim() === 'EXISTS') {
            setStageDone(true);
          }
        } catch (e) {
          console.error('Errore invio tempo cookie:', e);
        }
      })();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (typeof c === 'number' && c > 0 ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, racer, foundStage]);
  const { location } = useLiveLocation();

  useEffect(() => {
    if (raceData) {
      try {
        setParsed(JSON.parse(decodeURIComponent(raceData as string)));
      } catch {
        setParsed(null);
      }
    }
    // Recupera i dati del pilota
    AsyncStorage.getItem('racerData').then((data) => {
      if (data) setRacer(JSON.parse(data));
    });
  }, [raceData]);

  if (!parsed || !racer) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Caricamento...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Nome della gara */}
      <ThemedText type="title" style={styles.garaTitle}>{parsed.name}</ThemedText>

      {/* Logo */}
      <Image
        source={require('@/assets/images/1000curve_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Nome del pilota */}
      <ThemedText style={styles.racerName}>{racer.racerfullname}</ThemedText>


      {/* Box input codice tappa + bottone cerca */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Codice tappa"
          value={stageCode}
          onChangeText={setStageCode}
        />
        <Button
          title="Cerca"
          onPress={async () => {
            setStageDone(null); // reset stato
            // Cerca la tappa e normalizza la struttura address
            const stage = parsed.raceLocations?.find((loc: any) => String(loc.code) === stageCode);
            let found = null;
            if (stage && stage.address && typeof stage.address === 'object') {
              function dmsToDecimal(val: any) {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') {
                  if (/^-?\d+\.\d+$/.test(val.trim())) return parseFloat(val);
                  const dmsMatch = val.match(/(\d+)[°\s]+(\d+)[']?[\s]*(\d+(?:\.\d+)?)["\s]*([NSEW])?/i);
                  if (dmsMatch) {
                    let deg = parseFloat(dmsMatch[1]);
                    let min = parseFloat(dmsMatch[2]);
                    let sec = parseFloat(dmsMatch[3]);
                    let dir = dmsMatch[4];
                    let dec = deg + min/60 + sec/3600;
                    if (dir && (dir.toUpperCase() === 'S' || dir.toUpperCase() === 'W')) dec = -dec;
                    return dec;
                  }
                }
                return undefined;
              }
              const lat = dmsToDecimal(stage.address.latitude);
              const lon = dmsToDecimal(stage.address.longitude);
              found = { ...stage, latitude: lat, longitude: lon };
            } else {
              found = stage || null;
            }
            setFoundStage(found);
            // Chiamata API per verificare se la tappa è già stata fatta
            if (found && racer) {
              try {
                const params = new URLSearchParams({
                  action: 'get',
                  getAction: 'raceLocationDone',
                  racerId: racer.racerid,
                  clientId: racer.racerclientid,
                  raceLocationCode: found.code,
                });
                const url = `https://crm.1000curve.com/Racer?${params.toString()}`;
                const headers = {
                  'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
                };
                const response = await fetch(url, { method: 'GET', headers });
                const text = await response.text();
                let done = false;
                try {
                  const data = text ? JSON.parse(text) : null;
                  done = data === true || data?.done === true;
                } catch {
                  done = text === 'true';
                }
                setStageDone(done);
              } catch {
                setStageDone(null);
              }
            }
          }}
        />
      </View>


      {/* Cookie completati: spostato in fondo */}

      {foundStage && (
        <View style={styles.foundStageBox}>
          <ThemedText type="subtitle">{foundStage.name}</ThemedText>
          {location && foundStage.latitude != null && foundStage.longitude != null ? (
            getDistanceFromLatLonInMeters(
              location.latitude,
              location.longitude,
              Number(foundStage.latitude),
              Number(foundStage.longitude)
            ) <= 100 ? (
              stageDone === true ? (
                <ThemedText style={{ color: '#0a7ea4', fontWeight: 'bold', fontSize: 20, marginVertical: 16 }}>Cookie già fatto</ThemedText>
              ) : countdown === null ? (
                <Button title="START" onPress={() => setCountdown(10)} />
              ) : (
                <View style={{ backgroundColor: '#d00', borderRadius: 8, paddingVertical: 32, paddingHorizontal: 48, marginTop: 16, marginBottom: 8, minWidth: 120, alignItems: 'center', justifyContent: 'center' }}>
                  <ThemedText style={{ color: '#fff', fontSize: 48, fontWeight: 'bold', textAlign: 'center', lineHeight: 56 }}>{countdown}</ThemedText>
                </View>
              )
            ) : (
              <>
                <ThemedText style={{ color: '#d00', marginBottom: 8 }}>
                  Sei ancora lontano dal cookie. Recati qui:
                </ThemedText>
                <Button
                  title="Apri in Google Maps"
                  onPress={() => {
                    const url = `https://www.google.com/maps/search/?api=1&query=${foundStage.latitude},${foundStage.longitude}`;
                    Linking.openURL(url);
                  }}
                />
              </>
            )
          ) : (
            <ThemedText style={{ color: '#d00' }}>Coordinate tappa non disponibili</ThemedText>
          )}
        </View>
      )}
      {/* Pulsante Cookie Completati SEMPRE visibile in fondo */}
      <View style={{ width: '100%', maxWidth: 400, marginBottom: 24 }}>
        <Button
          title="Cookie completati"
          onPress={async () => {
            if (!racer) return;
            try {
              const params = new URLSearchParams({
                action: 'get',
                getAction: 'getRacerLocationTimesHtml',
                racerId: racer.racerid,
                clientId: racer.racerclientid,
              });
              const url = `https://crm.1000curve.com/Racer?${params.toString()}`;
              const fetchHeaders = {
                'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
              };
              const response = await fetch(url, { method: 'GET', headers: fetchHeaders });
              const html = await response.text();
              // Estrai la tabella dall'HTML e converti in array
              // DOMParser non è disponibile in React Native, quindi usiamo una regex semplice per estrarre la tabella
              const tableMatch = html.match(/<table[\s\S]*?<thead>([\s\S]*?)<\/thead>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>[\s\S]*?<\/table>/i);
              if (!tableMatch) throw new Error('Tabella non trovata');
              const theadHtml = tableMatch[1];
              const tbodyHtml = tableMatch[2];
              // Estrai headers
              const headerMatches = Array.from(theadHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi));
              // Funzione per pulire il testo HTML (rimuove tag e sostituisce entità comuni)
              function cleanCellText(str: string) {
                return str
                  .replace(/<[^>]+>/g, '')
                  .replace(/&nbsp;?/gi, ' ') // rimuovi anche varianti senza ;
                  .replace(/\u00a0/g, '') // rimuovi carattere spazio non separabile
                  .replace(/&amp;/gi, '&')
                  .replace(/&lt;/gi, '<')
                  .replace(/&gt;/gi, '>')
                  .replace(/&quot;/gi, '"')
                  .replace(/&#39;/gi, "'")
                  .replace(/\s+/g, ' ')
                  .trim();
              }
              const headersArr = headerMatches.map((m) => cleanCellText(m[1]));
              // Estrai righe
              const rowMatches = Array.from(tbodyHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
              const rowsArr = rowMatches.map((rowMatch) => {
                const cellMatches = Array.from(rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
                return cellMatches.map((c) => cleanCellText(c[1]));
              });
              setCookieTableHeaders(headersArr);
              setCookieTableRows(rowsArr);
            } catch (e) {
              console.error('Errore nel recupero dei cookie completati:', e);
              alert('Errore nel recupero dei cookie completati');
            }
          }}
        />
      </View>

      {/* Visualizzazione tabella cookie completati */}
      {cookieTableRows && cookieTableHeaders && (
        <View style={{ width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#0a7ea4', marginBottom: 24, overflow: 'hidden' }}>
          <ScrollView horizontal={false} style={{ width: '100%' }}>
            <View>
              <View style={{ flexDirection: 'row', backgroundColor: '#0a7ea4' }}>
                {cookieTableHeaders.map((header, idx) => (
                  <View
                    key={idx}
                    style={{
                      flex: 1,
                      minWidth: `${100 / cookieTableHeaders.length}%`,
                      maxWidth: `${100 / cookieTableHeaders.length}%`,
                      padding: 8,
                      borderRightWidth: idx < cookieTableHeaders.length - 1 ? 1 : 0,
                      borderColor: '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>{header}</ThemedText>
                  </View>
                ))}
              </View>
              {cookieTableRows.map((row, rIdx) => (
                <View
                  key={rIdx}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: rIdx % 2 === 0 ? '#f5f5f5' : '#e0f7fa',
                  }}
                >
                  {row.map((cell: string, cIdx: number) => (
                    <View
                      key={cIdx}
                      style={{
                        flex: 1,
                        minWidth: `${100 / cookieTableHeaders.length}%`,
                        maxWidth: `${100 / cookieTableHeaders.length}%`,
                        padding: 8,
                        borderRightWidth: cIdx < row.length - 1 ? 1 : 0,
                        borderColor: '#ccc',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ThemedText style={{ fontSize: 13, textAlign: 'center' }}>{cell}</ThemedText>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}



const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  garaTitle: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
    alignSelf: 'center',
  },
  racerName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    alignSelf: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    borderWidth: 0,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  foundStageBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
});
