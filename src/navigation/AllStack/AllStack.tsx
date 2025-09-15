import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Splash from '../../screens/Splash/Splash';
import CameraScreen from '../../screens/CameraScreen/CameraScreen';

const Stack = createNativeStackNavigator();
const AllStack = () => {
  return (
   <NavigationContainer>
    <Stack.Navigator initialRouteName='Splash' screenOptions={{headerShown:false}}>
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="CameraScreen" component={CameraScreen} />
    </Stack.Navigator>
   </NavigationContainer>
  )
}

export default AllStack

const styles = StyleSheet.create({})