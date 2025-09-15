import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Splash from '../../screens/Splash/Splash';
import CameraScreen from '../../screens/CameraScreen/CameraScreen';
import Gallery from '../../screens/Gallery/Gallery';
import VideoPlayer from '../../screens/VideoPlayer/VideoPlayer';
import { getCurrentLocation } from '../../utils/locationService';

const Stack = createNativeStackNavigator();
const AllStack = () => {

  useEffect(() => {
    (async () => {
      const location = await getCurrentLocation();
      
    })();
  }, []);
  return (
   <NavigationContainer>
    <Stack.Navigator initialRouteName='Splash' screenOptions={{headerShown:false}}>
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="CameraScreen" component={CameraScreen} />
      <Stack.Screen name="Gallery" component={Gallery} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
    </Stack.Navigator>
   </NavigationContainer>
  )
}

export default AllStack

const styles = StyleSheet.create({})