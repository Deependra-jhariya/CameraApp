import { StyleSheet, Text, View } from 'react-native';
import React, { useEffect } from 'react';
import { useAppNavigation } from '../../utils/navigationhelper';

const Splash = () => {
  const { replaceTo } = useAppNavigation();
  useEffect(() => {
   setTimeout(() => {
    replaceTo('CameraScreen');
   }, 3000);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 30, color: '#000000' }}>Splash</Text>
    </View>
  );
};

export default Splash;

const styles = StyleSheet.create({});
