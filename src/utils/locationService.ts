// src/services/locationService.ts
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';

// ✅ Ask for runtime permission
export const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app requires access to your location.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

// ✅ Open system location settings
export const openLocationSettings = () => {
  if (Platform.OS === 'android') {
    Linking.openSettings();
  } else {
    Linking.openURL('App-Prefs:Privacy&path=LOCATION');
  }
};

// ✅ Reverse geocoding (lat/lon -> address)
export const getFormattedAddress = async (lat: number, lon: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'ReactNativeApp/1.0',
          'Accept-Language': 'en',
        },
      },
    );
    const data = await response.json();
    return data?.display_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

// ✅ Check if location services are enabled
export const checkLocationEnabled = async (): Promise<boolean> => {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      () => resolve(true),
      error => {
        if (error.code === 2) {
          // 2 = Location services disabled
          resolve(false);
        } else {
          resolve(true); // other errors are permission-related
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );
  });
};

// ✅ Get current location with full flow
export const getCurrentLocation = async (): Promise<{
  latitude: number;
  longitude: number;
  address: string | null;
} | null> => {
  try {
    // Step 1: Ask permission
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please allow location permission to use this feature.',
        [{ text: 'OK' }],
      );
      return null;
    }

    // Step 2: Check if location services are ON
    const enabled = await checkLocationEnabled();
    if (!enabled) {
      Alert.alert(
        'Location Disabled',
        'Please enable location services.',
        [{ text: 'Open Settings', onPress: openLocationSettings }],
      );
      return null;
    }

    // Step 3: Get current position
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        async position => {
          const { latitude, longitude } = position.coords;
          const address = await getFormattedAddress(latitude, longitude);
          resolve({ latitude, longitude, address });
        },
        error => {
          console.error('Location error:', error.message);
          Alert.alert(
            'Location Error',
            'Unable to fetch your location.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openLocationSettings },
            ],
          );
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    });
  } catch (err) {
    console.error('Unexpected error while fetching location:', err);
    return null;
  }
};
