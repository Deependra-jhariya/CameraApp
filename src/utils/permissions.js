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