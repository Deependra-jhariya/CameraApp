import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import React, { useEffect } from 'react';
import { useAppNavigation } from '../../utils/navigationhelper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppColors } from '../../themes/appColors';
const Splash = () => {
  const { replaceTo } = useAppNavigation();
  useEffect(() => {
   setTimeout(() => {
    replaceTo('CameraScreen');
   }, 3000);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Ionicons name="videocam" size={56} color="#0b5cff" />
      </View>
      <Text style={styles.appName}>CameraApp</Text>
      <Text style={styles.tagline}>Record videos with live location and timestamp</Text>
      <ActivityIndicator size="small" color="#0b5cff" style={styles.spinner} />
    </View>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.lightBule,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  appName: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '600',
    color: AppColors.white,
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    color: AppColors.gray,
  },
  spinner: {
    marginTop: 20,
  },
});
