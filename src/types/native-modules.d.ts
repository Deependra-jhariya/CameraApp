declare module 'react-native-fs' {
  const RNFS: any;
  export default RNFS;
}

declare module 'react-native-compressor' {
  export const Video: {
    compress: (
      path: string,
      options?: {
        compressionMethod?: 'auto' | 'manual';
        quality?: 'low' | 'medium' | 'high';
        bitrate?: number;
        maxSize?: number;
      }
    ) => Promise<string>;
  };
}


