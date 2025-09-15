import {
  Alert,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  useCameraDevices,
} from 'react-native-vision-camera';

const CameraScreen = ({ settings, onUpdateSettings }) => {
  const cameraRef = useRef<Camera>(null);
  const devices = useCameraDevices('wide-angle-camera');
  const device = devices.back || devices.front || devices?.[0];

  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // request camera permission proactively
    (async () => {
      const status = await Camera.requestCameraPermission();
      if (status !== 'authorized') {
        Alert.alert('Camera permission required');
      }
      const micStatus = await Camera.requestMicrophonePermission();
      if (micStatus !== 'authorized') {
        Alert.alert('Microphone permission required');
      }
    })();
  }, []);

  if (!device) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading camera...</Text>
      </View>
    );
  }

  const startRecording = async () => {
    try {
      setIsRecording(true);
      await cameraRef.current?.startRecording({
        fileType: 'mp4',
        flash: 'off',
        onRecordingFinished: async (video) => {
          setIsRecording(false);
          Alert.alert('Saved', `Video saved: ${video.path}`);
          // TODO: push to API or apply ffmpeg overlay here
        },
        onRecordingError: (err) => {
          setIsRecording(false);
          console.error('Recording error', err);
          Alert.alert('Error', 'Recording failed: ' + (err.message || ''));
        },
      });
    } catch (e) {
      setIsRecording(false);
      Alert.alert('Error', e.message || 'Unable to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      await cameraRef.current?.stopRecording();
      setIsRecording(false);
    } catch (e) {
      console.warn('stop err', e.message);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Camera
        ref={cameraRef}
        style={{ flex: 1 }}
        device={device}
        isActive={true}
        video={true}
        audio={true}
      />

      {/* Resolution badge */}
      <View style={{ position: 'absolute', top: 14, left: 14 }}>
        <Text>{settings?.videoResolution || 'Auto'}</Text>
      </View>

      {/* Location badge toggle */}
      <View style={{ position: 'absolute', top: 14, right: 14 }}>
        <TouchableOpacity
          onPress={() => {
            const newTag = !settings?.locationTagging;
            onUpdateSettings?.({ ...settings, locationTagging: newTag });
          }}
        >
          <Text>{settings?.locationTagging ? 'Loc: ON' : 'Loc: OFF'}</Text>
        </TouchableOpacity>
      </View>

      {/* Record button */}
      <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center' }}>
        <TouchableOpacity onPress={isRecording ? stopRecording : startRecording}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isRecording ? 'red' : 'white',
              borderWidth: 2,
              borderColor: '#000',
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CameraScreen;
