
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

export function useLiveLocation() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const watchId = useRef<Location.LocationSubscription | null>(null);
  useEffect(() => {
    let isMounted = true;
    async function startWatch() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permesso di localizzazione negato');
        setEnabled(false);
        return;
      }
      setEnabled(true);
      watchId.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (loc) => {
          if (isMounted) setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      );
    }
    startWatch();
    return () => {
      isMounted = false;
      if (watchId.current) {
        watchId.current.remove();
      }
    };
  }, []);

  return { location, enabled, errorMsg };
}
