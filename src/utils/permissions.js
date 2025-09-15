import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';


export async function checkAndRequestCameraAudio() {
const cameraPerm = Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA;
const audioPerm = Platform.OS === 'android' ? PERMISSIONS.ANDROID.RECORD_AUDIO : PERMISSIONS.IOS.MICROPHONE;


const cam = await check(cameraPerm);
if (cam !== RESULTS.GRANTED) {
const r = await request(cameraPerm);
if (r !== RESULTS.GRANTED) throw new Error('Camera permission denied');
}


const aud = await check(audioPerm);
if (aud !== RESULTS.GRANTED) {
const r = await request(audioPerm);
if (r !== RESULTS.GRANTED) throw new Error('Audio permission denied');
}


return true;
}


export async function checkAndRequestLocation() {
const locPerm = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
const loc = await check(locPerm);
if (loc !== RESULTS.GRANTED) {
const r = await request(locPerm);
if (r !== RESULTS.GRANTED) throw new Error('Location permission denied');
}
return true;
}

// Request permissions needed to save videos to the gallery
export async function checkAndRequestGalleryPermissions() {
  if (Platform.OS === 'android') {
    // Android 13+ uses READ_MEDIA_VIDEO/IMAGES; older use READ/WRITE_EXTERNAL_STORAGE
    const isTiramisuOrAbove = Platform.constants?.Release >= '13' || Platform.Version >= 33;
    if (isTiramisuOrAbove) {
      const readImages = await check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
      if (readImages !== RESULTS.GRANTED) {
        const r1 = await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        if (r1 !== RESULTS.GRANTED) throw new Error('Media Images permission denied');
      }
      const readVideo = await check(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);
      if (readVideo !== RESULTS.GRANTED) {
        const r2 = await request(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);
        if (r2 !== RESULTS.GRANTED) throw new Error('Media Video permission denied');
      }
    } else {
      const read = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
      if (read !== RESULTS.GRANTED) {
        const r = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
        if (r !== RESULTS.GRANTED) throw new Error('Storage read permission denied');
      }
      // WRITE only up to SDK 28; requests on higher SDKs will be ignored
      if (Platform.Version <= 28) {
        const write = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
        if (write !== RESULTS.GRANTED) {
          const r = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
          if (r !== RESULTS.GRANTED) throw new Error('Storage write permission denied');
        }
      }
    }
  } else {
    // iOS requires Photo Library Add permission
    const add = await check(PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY);
    if (add !== RESULTS.GRANTED) {
      const r = await request(PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY);
      if (r !== RESULTS.GRANTED) throw new Error('Photo Library add permission denied');
    }
  }
  return true;
}