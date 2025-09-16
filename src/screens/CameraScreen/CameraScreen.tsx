import {
  Alert,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  useCameraDevice,
} from 'react-native-vision-camera';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { checkAndRequestGalleryPermissions } from '../../utils/permissions';
import { useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCurrentLocation } from '../../utils/locationService';
import { AppColors } from '../../themes/appColors';
import { formatTime } from '../../utils/formatTime';
import { useAppNavigation } from '../../utils/navigationhelper';
import RNFS from 'react-native-fs';
import { Video as VideoCompressor } from 'react-native-compressor';


type CameraScreenProps = {
  settings?: any;
  onUpdateSettings?: (s: any) => void;
};


const CameraScreen = ({ settings, onUpdateSettings }: CameraScreenProps) => {
  const cameraRef = useRef<Camera>(null);
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const device = useCameraDevice(cameraPosition);
  const {navigateTo} = useAppNavigation()
  const isFocused = useIsFocused();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastThumb, setLastThumb] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nowStr, setNowStr] = useState<string>(new Date().toLocaleString());
  const [hasPermissions, setHasPermissions] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [lastSavedSizeMB, setLastSavedSizeMB] = useState<number | null>(null);
  const [resolution, setResolution] = useState<'auto' | '720p' | '1080p' | '4k'>('auto');

  // Choose a camera format that matches the requested resolution
  const selectedFormat = useMemo(() => {
    if (!device) return undefined as any;
    const formats = device.formats ?? [];
    if (!formats.length) return undefined as any;

    if (resolution === 'auto') {
      // Pick the highest resolution format available
      let best: any = formats[0];
      let bestPixels = ((best as any).videoWidth ?? 0) * ((best as any).videoHeight ?? 0);
      for (const f of formats) {
        const w = (f as any).videoWidth ?? 0;
        const h = (f as any).videoHeight ?? 0;
        const pixels = w * h;
        if (pixels > bestPixels) {
          best = f;
          bestPixels = pixels;
        }
      }
      return best;
    }

    const targetH = resolution === '720p' ? 720 : resolution === '1080p' ? 1080 : 2160;
    // Prefer exact height match
    const exact = formats.find(f => (f as any).videoHeight === targetH);
    if (exact) return exact as any;
    // Otherwise choose closest below, else closest above
    let below: any = undefined;
    let belowDiff = Number.POSITIVE_INFINITY;
    let above: any = undefined;
    let aboveDiff = Number.POSITIVE_INFINITY;
    for (const f of formats) {
      const h = (f as any).videoHeight ?? 0;
      const d = Math.abs(h - targetH);
      if (h <= targetH && d < belowDiff) {
        below = f; belowDiff = d;
      }
      if (h > targetH && d < aboveDiff) {
        above = f; aboveDiff = d;
      }
    }
    return below ?? above ?? formats[0];
  }, [device, resolution]);

  useEffect(() => {
    (async () => {
      const cam = await Camera.requestCameraPermission();
      const mic = await Camera.requestMicrophonePermission();
      const granted = cam === 'granted' && mic === 'granted';
      setHasPermissions(granted);
      if (!granted) {
        Alert.alert('Permissions', 'Camera and microphone permissions are required.');
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

  if (!device || !hasPermissions) {
    return (
      <View style={styles.centered}>
        <Text>Preparing camera...</Text>
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
            // Compress the recorded video based on selected quality
            let compressedPath: string = filePath;
            try {
              compressedPath = await VideoCompressor.compress(filePath, {
                compressionMethod: 'auto',
                quality,
              });
            } catch (compressErr) {
              console.warn('Video compression failed, saving original.');
              compressedPath = filePath;
            }

            // Compute file size in MB
            const statTargetPath = compressedPath.replace('file://', '');
            let sizeMB: number | null = null;
            try {
              const stat = await RNFS.stat(statTargetPath);
              const bytes = Number(stat.size || 0);
              sizeMB = Number((bytes / (1024 * 1024)).toFixed(2));
            } catch {}

            // Save compressed file to gallery
            await CameraRoll.save(compressedPath, { type: 'video', album: 'CameraApp' });
            setLastSavedSizeMB(sizeMB);
            const usedW = (selectedFormat as any)?.videoWidth ?? null;
            const usedH = (selectedFormat as any)?.videoHeight ?? null;
            const resStr = usedW && usedH ? `\nResolution: ${usedW}x${usedH}` : '';
            Alert.alert('Saved', `Video saved to gallery.${resStr}${sizeMB != null ? `\nSize: ${sizeMB} MB` : ''}`);
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
        format={selectedFormat}
        onInitialized={() => setCameraReady(true)}
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

      {/* Resolution toggle at top-right */}
      {!isRecording && (
        <View style={styles.resolutionToggle}>
          <TouchableOpacity
            onPress={() => {
              setResolution(r => (r === 'auto' ? '720p' : r === '720p' ? '1080p' : r === '1080p' ? '4k' : 'auto'));
            }}
            disabled={!cameraReady}
          >
            <View style={[styles.qualityBtn, { opacity: cameraReady ? 1 : 0.6 }]}>
              <Text style={styles.qualityText}>Resolution: {resolution.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Gallery  with last video thumb (hidden while recording) */}
      {!isRecording && (
        <View style={styles.galleryWrap}>
          <TouchableOpacity onPress={() => navigateTo('Gallery')}>
            {lastThumb ? (
              <Image source={{ uri: lastThumb }} style={styles.galleryThumb} />
            ) : (
              <View style={styles.galleryPlaceholder}>
                <Ionicons name="images" size={24} color="#000" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Controls: Pause/Resume*/}
      <View style={styles.controlsRow}>
        {isRecording && (
          !isPaused ? (
            <TouchableOpacity onPress={pauseRecording}>
              <View style={[styles.smallBtn, { marginRight: 16 }]}>
                <Ionicons name="pause" size={28} color="#000" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={resumeRecording}>
              <View style={[styles.smallBtn, { marginRight: 16 }]}>
                <Ionicons name="play" size={28} color="#000" />
              </View>
            </TouchableOpacity>
          )
        )}

        {!isRecording && (
          <View style={{ width: 76 }} />
        )}

        {!isRecording ? (
          <TouchableOpacity
            onPress={() => {
              if (!cameraReady) {
                Alert.alert('Please wait', 'Camera is initializing...');
                return;
              }
              startRecording();
            }}
            disabled={!cameraReady}
          >
            <View style={styles.recordBtn} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={stopRecording}>
            <View style={[styles.recordBtn, styles.recordBtnActive]} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => setCameraPosition(p => (p === 'back' ? 'front' : 'back'))}
          disabled={isRecording}
        >
          <View style={[styles.smallBtn, { marginLeft: 16, opacity: isRecording ? 0.5 : 1 }]}>
            <Ionicons name="camera-reverse" size={26} color="#000" />
          </View>
        </TouchableOpacity>
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
  resolutionToggle: {
    position: 'absolute',
    top: 14,
    right: 14,
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
    borderColor: AppColors.white,
  },
  galleryPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: AppColors.lightWhite,
    borderWidth: 1,
    borderColor: AppColors.white,
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
    borderColor: AppColors.white,
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
    borderColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityRow: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qualityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AppColors.lightWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.white,
  },
  qualityText: {
    color: '#000',
    fontWeight: '600',
  },
  sizeText: {
    color: '#fff',
    textShadowColor: AppColors.black,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  locationOverlay: {
    position: 'absolute',
    left: 16,
    bottom: 150,
    right: 16,
  },
  overlayText: {
    color: '#fff',
    textShadowColor: AppColors.black,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});
