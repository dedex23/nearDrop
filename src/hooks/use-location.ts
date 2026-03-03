import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useAppStore } from '@/stores/app-store';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setUserLocation = useAppStore((s) => s.setUserLocation);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          if (!mounted) return;
          setLocation(loc);
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );

      if (mounted) {
        subscription = sub;
      } else {
        sub.remove(); // Component unmounted while awaiting
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // setUserLocation is a stable Zustand ref

  return { location, error };
}
