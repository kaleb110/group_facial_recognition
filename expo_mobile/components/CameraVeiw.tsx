import { Dimensions } from 'react-native';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CAMERA_WIDTH = screenWidth * 0.2;  // 40% of screen width
const CAMERA_HEIGHT = screenHeight * 0.4; // 30% of screen height

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface CameraViewProps {
  cameraType: CameraType;
  onFlip: () => void;
}

const CameraViewComponent = forwardRef(({ cameraType, onFlip }: CameraViewProps, ref) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  useImperativeHandle(ref, () => ({
    async capture() {
      if (!cameraRef.current) return '';
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        if (photo && photo.base64) {
          return `data:image/jpeg;base64,${photo.base64.replace(/^data:image\/\w+;base64,/, '')}`;
        }
        return '';
      } catch (error) {
        console.error('Capture error:', error);
        return '';
      }
    },
  }));

  if (!permission) {
    return <ActivityIndicator size="large" />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
      >
        <TouchableOpacity style={styles.flipButton} onPress={onFlip}>
          <Text style={styles.buttonText}>Flip Camera</Text>
        </TouchableOpacity>
      </CameraView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: CAMERA_WIDTH,
    height: CAMERA_HEIGHT,
    borderRadius: 10, // Optional rounded corners
    overflow: 'hidden', // Keep camera within bounds
  },
  camera: {
    flex: 1, // Fill container
  },
  flipButton: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  permissionText: {
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CameraViewComponent;