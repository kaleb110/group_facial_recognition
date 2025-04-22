import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

export default function FaceRecognitionScreen() {
  const [image, setImage] = useState(null);
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [persons, setPersons] = useState([]);
  const [showRegister, setShowRegister] = useState(false);

  // Load registered persons on startup
  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const response = await axios.get('http://localhost:5001/get_persons');
      setPersons(response.data);
    } catch (error) {
      console.error('Error fetching persons:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to select an image');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      processImage(result.assets[0].base64);
    }
  };

  const processImage = async (base64Image) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5001/recognize_faces', {
        image: `data:image/jpeg;base64,${base64Image}`
      });

      if (response.data.error) {
        Alert.alert('Error', response.data.error);
        return;
      }

      setImage(`data:image/jpeg;base64,${base64Image}`);
      setFaces(response.data.faces);

    } catch (error) {
      console.error('Recognition error:', error);
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setLoading(false);
    }
  };

  const registerFace = async () => {
    if (!name || !image) {
      Alert.alert('Error', 'Please enter a name and select an image');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5001/register_face', {
        name,
        image: image
      });
      Alert.alert('Success', 'Face registered successfully');
      setName('');
      setShowRegister(false);
      fetchPersons();
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register face');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Select Group Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#4CAF50' }]}
        onPress={() => setShowRegister(!showRegister)}
      >
        <Text style={styles.buttonText}>
          {showRegister ? 'Cancel Registration' : 'Register New Person'}
        </Text>
      </TouchableOpacity>

      {showRegister && (
        <View style={styles.registerForm}>
          <Text style={styles.label}>Enter Name:</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Person's name"
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF9800' }]}
            onPress={registerFace}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Register Face</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <Text style={styles.loadingText}>Processing...</Text>}

      {image && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="contain"
          />

          {faces.map((face, index) => (
            <View
              key={index}
              style={[
                styles.faceBox,
                {
                  left: face.x,
                  top: face.y,
                  width: face.width,
                  height: face.height,
                }
              ]}
            >
              <Text style={styles.faceLabel}>
                {face.name} ({Math.round(face.confidence * 100)}%)
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.personsList}>
        <Text style={styles.sectionTitle}>Registered Persons:</Text>
        {persons.length === 0 ? (
          <Text>No persons registered yet</Text>
        ) : (
          persons.map(person => (
            <Text key={person.id} style={styles.personItem}>
              {person.name}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  registerForm: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  loadingText: {
    fontSize: 16,
    marginVertical: 10,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  faceLabel: {
    position: 'absolute',
    bottom: -25,
    left: 0,
    backgroundColor: '#FF0000',
    color: 'white',
    padding: 2,
    fontSize: 12,
  },
  personsList: {
    width: '100%',
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  personItem: {
    fontSize: 16,
    paddingVertical: 5,
  },
});