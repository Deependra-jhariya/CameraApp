import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppColors } from '../../themes/appColors';


type RouteParams = { uri: string };

const VideoPlayer = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as unknown as RouteParams;

  if (!params?.uri) {
    return (
      <View style={styles.centered}>
        <Text>No video selected</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.playerContainer}>
      <Video
        source={{ uri: params.uri }}
        style={styles.video}
        controls
        resizeMode="contain"
      />
    </View>
  );
};

export default VideoPlayer;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerContainer: {
    flex: 1,
    backgroundColor:AppColors.black,
  },
  video: {
    flex: 1,
  },
});
