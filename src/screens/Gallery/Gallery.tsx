import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Image, Dimensions, StyleSheet } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { AppColors } from '../../themes/appColors';
import { useAppNavigation } from '../../utils/navigationhelper';


type VideoItem = {
  id: string;
  uri: string;
  duration: number;
  filename?: string | null;
};

const Gallery = () => {
  const {navigateTo} = useAppNavigation()
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const res = await CameraRoll.getPhotos({
        first: 60,
        assetType: 'Videos',
        include: ['filename', 'playableDuration'],
      });
      const items: VideoItem[] = res.edges.map((e) => ({
        id: e.node.id,
        uri: e.node.image.uri,
        duration: e.node.image.playableDuration,
        filename: e.node.image.filename,
      }));
      setVideos(items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const numColumns = 3;
  const gap = 6;
  const size = (Dimensions.get('window').width - gap * (numColumns + 1)) / numColumns;

  return (
    <View style={[styles.container, { paddingHorizontal: gap }]}>
      <Text style={[styles.header]}>Gallery</Text>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadVideos}
        numColumns={numColumns}
        columnWrapperStyle={{ marginBottom: gap }}
        contentContainerStyle={{ paddingBottom: gap, gap }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigateTo('VideoPlayer', { uri: item.uri })}
            style={[styles.tile, { width: size, height: size, marginLeft: gap }]}
          >
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{Math.round(item.duration)}s</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default Gallery;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tile: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: AppColors.black,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: AppColors.white,
    fontSize: 10,
  },
});
