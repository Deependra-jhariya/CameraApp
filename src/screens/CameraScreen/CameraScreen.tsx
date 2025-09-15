import {
  Alert,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  useCameraDevice,
} from 'react-native-vision-camera';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { checkAndRequestGalleryPermissions } from '../../utils/permissions';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCurrentLocation } from '../../utils/locationService';
import { AppColors } from '../../themes/appColors';


type CameraScreenProps = {
  settings?: any;
  onUpdateSettings?: (s: any) => void;
};

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return h === '00' ? `${m}:${s}` : `${h}:${m}:${s}`;
};

const CameraScreen = ({ settings, onUpdateSettings }: CameraScreenProps) => {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastThumb, setLastThumb] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nowStr, setNowStr] = useState<string>(new Date().toLocaleString());

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      if (status !== 'granted') {
        Alert.alert('Camera permission required');
      }
      const micStatus = await Camera.requestMicrophonePermission();
      if (micStatus !== 'granted') {
        Alert.alert('Microphone permission required');
      }
      try {
        await checkAndRequestGalleryPermissions();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Gallery permission required';
        Alert.alert('Permission', msg);
      }
    })();
  }, []);

  const loadLastVideoThumb = async () => {
    try {
      const res = await CameraRoll.getPhotos({ first: 1, assetType: 'Videos' });
      const uri = res.edges?.[0]?.node?.image?.uri;
      if (uri) setLastThumb(uri);
    } catch {}
  };

  useEffect(() => {
    if (isFocused) {
      loadLastVideoThumb();
      const t = setInterval(() => setNowStr(new Date().toLocaleString()), 1000);
      return () => clearInterval(t);
    }
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) return;
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        setAddress(loc.address);
        setCoords({ latitude: loc.latitude, longitude: loc.longitude });
      }
    })();
  }, [isFocused]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const startedAt = Date.now() - elapsedMs;
      intervalRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAt);
      }, 250);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text>Loading camera...</Text>
      </View>
    );
  }

  const startRecording = async () => {
    try {
      setElapsedMs(0);
      setIsPaused(false);
      setIsRecording(true);
      await cameraRef.current?.startRecording({
        fileType: 'mp4',
        flash: 'off',
        onRecordingFinished: async (video) => {
          setIsRecording(false);
          setIsPaused(false);
          setElapsedMs(0);
          try {
            const filePath = video.path?.startsWith('file://') ? video.path : `file://${video.path}`;
            await CameraRoll.save(filePath, { type: 'video', album: 'CameraApp' });
            Alert.alert('Saved', 'Video saved to gallery.');
            loadLastVideoThumb();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not save to gallery';
            Alert.alert('Save failed', msg);
          }
        },
        onRecordingError: (err) => {
          setIsRecording(false);
          setIsPaused(false);
          console.error('Recording error', err);
          const msg = err instanceof Error ? err.message : '';
          Alert.alert('Error', 'Recording failed: ' + msg);
        },
      });
    } catch (e) {
      setIsRecording(false);
      const msg = e instanceof Error ? e.message : 'Unable to start recording';
      Alert.alert('Error', msg);
    }
  };

  const stopRecording = async () => {
    try {
      await cameraRef.current?.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      console.warn('stop err', msg);
    }
  };

  const pauseRecording = async () => {
    try {
      await cameraRef.current?.pauseRecording();
      setIsPaused(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert('Pause failed', msg);
    }
  };

  const resumeRecording = async () => {
    try {
      await cameraRef.current?.resumeRecording();
      setIsPaused(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert('Resume failed', msg);
    }
  };

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={isFocused}
        video={true}
        audio={true}
      />

      {/* Location/address/date overlay at bottom-left */}
      <View style={styles.locationOverlay}>
        {!!address && (
          <Text style={styles.overlayText} numberOfLines={2}>
            {address}
          </Text>
        )}
        {coords && (
          <Text style={styles.overlayText}>
            Latitude: {coords.latitude.toFixed(6)}  Longitude: {coords.longitude.toFixed(6)}
          </Text>
        )}
        <Text style={styles.overlayText}>{nowStr}</Text>
      </View>

      {/* Timer at top-left */}
      {isRecording && (
        <View style={styles.timerWrap}>
          <Text style={styles.timerText}>● {formatTime(elapsedMs)}</Text>
        </View>
      )}

      {/* Gallery button bottom-left with last video thumb */}
      <View style={styles.galleryWrap}>
        <TouchableOpacity onPress={() => navigation.navigate('Gallery')}>
          {lastThumb ? (
            <Image source={{ uri: lastThumb }} style={styles.galleryThumb} />
          ) : (
            <View style={styles.galleryPlaceholder}>
              <Ionicons name="images" size={24} color="#000" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Record/Pause/Resume buttons */}
      <View style={styles.controlsRow}>
        {!isRecording ? (
          <TouchableOpacity onPress={startRecording}>
            <View style={styles.recordBtn} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={stopRecording}>
              <View style={[styles.recordBtn, styles.recordBtnActive]} />
            </TouchableOpacity>
            {!isPaused ? (
              <TouchableOpacity onPress={pauseRecording}>
                <View style={styles.smallBtn}>
                  <Ionicons name="pause" size={28} color="#000" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={resumeRecording}>
                <View style={styles.smallBtn}>
                  <Ionicons name="play" size={28} color="#000" />
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  timerWrap: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  timerText: {
    color: 'red',
    fontWeight: 'bold',
  },
  locWrap: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  galleryWrap: {
    position: 'absolute',
    bottom: 40,
    left: 20,
  },
  galleryThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.black,
  },
  galleryPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: AppColors.lightWhite,
    borderWidth: 1,
    borderColor: AppColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: AppColors.black,
    marginRight: 16,
  },
  recordBtnActive: {
    backgroundColor: 'red',
  },
  smallBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AppColors.lightWhite,
    borderWidth: 2,
    borderColor: AppColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationOverlay: {
    position: 'absolute',
    left: 16,
    bottom: 120,
    right: 16,
  },
  overlayText: {
    color: '#fff',
    textShadowColor: AppColors.black,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});
