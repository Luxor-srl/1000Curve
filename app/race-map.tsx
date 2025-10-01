import RaceHeader from '@/components/RaceHeader';
import Sidebar from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
import { clearOffRunAuthData, getOffRunAuthData } from '@/utils/auth';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { WebView } from 'react-native-webview';

interface RaceLocation {
  order: number;
  code: string;
  name: string;
  description: string;
  points: number;
  address: {
    latitude: number;
    longitude: number;
  };
}

interface RaceDetails {
  name: string;
  slug: string;
  pointsName: string;
  raceLocations: RaceLocation[];
}

export default function RaceMapScreen() {
  const params = useLocalSearchParams();
  const raceSlug = params.raceSlug as string;
  const raceName = params.raceName as string;
  const pointsName = params.pointsName as string;
  const raceLocations = params.raceLocations ? JSON.parse(params.raceLocations as string) : [];
  const racerLocationTimes = params.racerLocationTimes ? JSON.parse(params.racerLocationTimes as string) : [];
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  console.log('RaceMap params:', { raceSlug, raceName, pointsName, raceLocationsCount: raceLocations.length, racerLocationTimesCount: racerLocationTimes.length });

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
        console.error('Errore nel caricamento dati utente:', error);
        router.replace('/');
      }
    };
    loadUserData();
  }, [router]);

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

  // Genera l'HTML per la mappa OpenStreetMap
  const generateMapHTML = () => {
    const validLocations = raceLocations.filter(
      (location: RaceLocation) => location.address?.latitude && location.address?.longitude
    );

    console.log('Valid locations for map:', validLocations.length, validLocations);

    if (validLocations.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
              }
              .message {
                text-align: center;
                color: #666;
                font-size: 16px;
              }
            </style>
          </head>
          <body>
            <div class="message">
              <h2>Nessuna tappa con coordinate GPS</h2>
              <p>Le tappe di questa gara non hanno coordinate valide per essere mostrate sulla mappa.</p>
            </div>
          </body>
        </html>
      `;
    }

    // Calcola il centro della mappa
    let minLat = validLocations[0].address.latitude;
    let maxLat = validLocations[0].address.latitude;
    let minLng = validLocations[0].address.longitude;
    let maxLng = validLocations[0].address.longitude;

    validLocations.forEach((location: RaceLocation) => {
      const lat = location.address.latitude;
      const lng = location.address.longitude;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    console.log('Map center:', centerLat, centerLng);

    const locationsData = validLocations.map((loc: RaceLocation) => {
      const racerTime = racerLocationTimes.find((rt: any) => rt.code === loc.code);
      return {
        lat: loc.address.latitude,
        lng: loc.address.longitude,
        code: loc.code,
        name: loc.name,
        points: loc.points,
        done: racerTime ? racerTime.done : false
      };
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            #map { height: 100vh; width: 100vw; }
            .custom-marker {
              background-color: #FFD700;
              border: 2px solid #ffffff;
              border-radius: 50%;
              width: 24px !important;
              height: 24px !important;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              color: #022C43;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .custom-marker-done {
              background-color: #4CAF50;
            }
            .leaflet-popup-content-wrapper {
              background: #FFD700;
              color: #022C43;
              border-radius: 12px;
              padding: 0;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              border: 2px solid #ffffff;
            }
            .leaflet-popup-content {
              margin: 0;
              font-size: 14px;
              line-height: 1.4;
              padding: 12px;
            }
            .popup-header {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 8px;
              border-bottom: 1px solid rgba(2, 44, 67, 0.2);
              padding-bottom: 6px;
            }
            .popup-code {
              display: inline-block;
              background: #022C43;
              color: #FFD700;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              margin-right: 8px;
            }
            .popup-points {
              font-size: 13px;
              color: #022C43;
              font-weight: 600;
            }
            .popup-points::before {
              content: '🏆 ';
            }
            .leaflet-popup-tip {
              background: #FFD700;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .leaflet-popup-tip {
              background: #FFD700;
            }
            .coordinates {
              position: absolute;
              bottom: 10px;
              right: 10px;
              background: rgba(255,255,255,0.9);
              padding: 5px 10px;
              border-radius: 4px;
              font-size: 10px;
              color: #666;
              z-index: 1000;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div class="coordinates">Centro: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}</div>
          <script>
            try {
              console.log('Initializing Leaflet map...');
              var map = L.map('map').setView([${centerLat}, ${centerLng}], 10);

              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
              }).addTo(map);

              const locations = ${JSON.stringify(locationsData)};
              console.log('Locations to render:', locations);

              locations.forEach(function(location) {
                var className = location.done ? 'custom-marker custom-marker-done' : 'custom-marker';
                var customIcon = L.divIcon({
                  className: className,
                  html: location.code,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                });

                L.marker([location.lat, location.lng], { icon: customIcon })
                  .addTo(map)
                  .bindPopup('<div class="popup-header">' + location.name + '</div><div class="popup-points">' + location.points + ' ${pointsName || 'punti'}</div>');
              });

              // Fit bounds to show all markers if there are multiple
              if (locations.length > 1) {
                var group = new L.featureGroup(locations.map(function(loc) {
                  return L.marker([loc.lat, loc.lng]);
                }));
                map.fitBounds(group.getBounds().pad(0.1));
              }

              console.log('Map initialized successfully with', locations.length, 'markers');
            } catch (error) {
              console.error('Error initializing map:', error);
              document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; background: #f0f0f0; height: 100vh; display: flex; align-items: center; justify-content: center;"><div><h2>Errore caricamento mappa</h2><p>Impossibile caricare la mappa. Controlla la connessione internet.</p></div></div>';
            }
          </script>
        </body>
      </html>
    `;    console.log('Generated HTML length:', html.length);
    return html;
  };  if (!userInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <RaceHeader
          pilotName={userInfo?.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''}
          onSidebarPress={handleSidebarOpen}
          onLogoutPress={handleLogout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <ThemedText style={styles.loadingText} allowFontScaling={false}>
            Caricamento...
          </ThemedText>
        </View>
        <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <RaceHeader
        pilotName={userInfo.firstname ? `${userInfo.firstname} ${userInfo.lastname}` : ''}
        onSidebarPress={handleSidebarOpen}
        onLogoutPress={handleLogout}
        onLogoPress={handleLogoPress}
      />

      {/* Header con titolo e pulsante indietro */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-left" size={16} color="#022C43" />
          <ThemedText style={styles.backButtonText} allowFontScaling={false}>
            Dettagli gara
          </ThemedText>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title} allowFontScaling={false}>
            Mappa - {raceName || 'Gara'}
          </ThemedText>
          <ThemedText style={styles.subtitle} allowFontScaling={false}>
            {raceLocations.length} tappe
          </ThemedText>
        </View>
      </View>

      {/* Mappa a schermo intero */}
      <View style={styles.mapContainer}>
        <WebView
          style={styles.map}
          source={{ html: generateMapHTML() }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          renderLoading={() => (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#FFD700" />
              <ThemedText style={styles.mapLoadingText} allowFontScaling={false}>
                Caricamento mappa...
              </ThemedText>
            </View>
          )}
          onError={(syntheticEvent) => {
            console.error('WebView error:', syntheticEvent.nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            console.error('WebView HTTP error:', syntheticEvent.nativeEvent);
          }}
          onLoadStart={() => console.log('WebView load start')}
          onLoadEnd={() => console.log('WebView load end')}
        />
      </View>

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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
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
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#022C43',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  mapLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
});