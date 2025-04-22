import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Alert,
  ScrollView, TextInput, Dimensions, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const { width } = Dimensions.get('window');
const IMAGE_PREVIEW_SIZE = width * 0.6;

export default function FaceRecognitionScreen() {
  const [image, setImage] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [persons, setPersons] = useState([]);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const response = await axios.get('http://localhost:5001/get_persons');
      setPersons(response.data);
    } catch (error) {
      console.error('Error fetching persons:', error);
      Alert.alert("Internal server error");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Need photo access to select image');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setBase64Image(result.assets[0].base64);
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setFaces([]);
    }
  };

  const processImage = async () => {
    if (!base64Image) {
      Alert.alert("No image selected");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5001/recognize_faces', {
        image: `data:image/jpeg;base64,${base64Image}`
      });

      if (response.data.error) {
        Alert.alert('Error', response.data.error);
        return;
      }

      const scaleX = IMAGE_PREVIEW_SIZE / response.data.image_width;
      const scaleY = IMAGE_PREVIEW_SIZE / response.data.image_height;

      const scaledFaces = response.data.faces.map(face => ({
        ...face,
        scaledX: face.x * scaleX,
        scaledY: face.y * scaleY,
        scaledWidth: face.width * scaleX,
        scaledHeight: face.height * scaleY,
      }));

      setFaces(scaledFaces);

    } catch (error) {
      console.error('Recognition error:', error);
      Alert.alert('Error', 'Failed to process image.');
    } finally {
      setLoading(false);
    }
  };

  const registerFace = async () => {
    if (!name || !image) {
      Alert.alert('Error', 'Name and image are required');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5001/register_face', {
        name,
        image
      });
      Alert.alert('Success', `${name} registered successfully`);
      setName('');
      setShowRegister(false);
      fetchPersons();
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🤖 Face Recognition</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.primary]} onPress={pickImage}>
          <Text style={styles.buttonText}>📷 Select Image</Text>
        </TouchableOpacity>

        {image && (
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={processImage}>
            <Text style={styles.buttonText}>🧠 Recognize Faces</Text>
          </TouchableOpacity>
        )}
      </View>

      {image && (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="cover"
          />
          {faces.map((face, idx) => (
            <View
              key={idx}
              style={[
                styles.faceBox,
                {
                  left: face.scaledX,
                  top: face.scaledY,
                  width: face.scaledWidth,
                  height: face.scaledHeight
                }
              ]}
            >
              <Text style={styles.faceLabel}>{face.name} ({Math.round(face.confidence)}%)</Text>
            </View>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#3f51b5" style={{ margin: 16 }} />}

      {showRegister && (
        <View style={styles.registerForm}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.button, styles.registerButton]}
            onPress={registerFace}
            disabled={loading || !name || !image}
          >
            <Text style={styles.buttonText}>💾 Save Face</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, showRegister ? styles.cancelButton : styles.registerToggle]}
        onPress={() => setShowRegister(!showRegister)}
      >
        <Text style={styles.buttonText}>
          {showRegister ? '✖ Cancel' : '➕ Register Face'}
        </Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Recognition Results</Text>
        {faces.length === 0 ? (
          <Text style={styles.noResult}>No faces detected yet</Text>
        ) : (
          faces.map((face, idx) => (
            <Text key={idx} style={styles.resultText}>
              {face.name} - {Math.round(face.confidence)}%
            </Text>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📇 Registered Persons ({persons.length})</Text>
        {persons.map((p, index) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TextInput
              value={p.editingName ?? p.name}
              onChangeText={(text) => {
                const updated = [...persons];
                updated[index].editingName = text;
                setPersons(updated);
              }}
              editable={p.isEditing}
              style={{
                flex: 1,
                borderBottomWidth: 1,
                borderColor: '#ccc',
                marginRight: 8,
                padding: 4,
              }}
            />
            {p.isEditing ? (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await axios.put(`http://localhost:5001/update_person/${p.id}`, {
                      name: p.editingName,
                    });
                    const updated = [...persons];
                    updated[index].name = p.editingName;
                    updated[index].isEditing = false;
                    setPersons(updated);
                  } catch {
                    Alert.alert('Update failed');
                  }
                }}
                style={[styles.button, { backgroundColor: '#4caf50' }]}
              >
                <Text style={styles.buttonText}>💾</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  const updated = [...persons];
                  updated[index].isEditing = true;
                  updated[index].editingName = p.name;
                  setPersons(updated);
                }}
                style={[styles.button, { backgroundColor: '#ff9800' }]}
              >
                <Text style={styles.buttonText}>✏️</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={async () => {
                try {
                  await axios.delete(`http://localhost:5001/delete_person/${p.id}`);
                  fetchPersons();
                } catch {
                  Alert.alert('Delete failed');
                }
              }}
              style={[styles.button, { backgroundColor: '#f44336', marginLeft: 6 }]}
            >
              <Text style={styles.buttonText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#3f51b5',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#3f51b5',
  },
  secondary: {
    backgroundColor: '#009688',
  },
  registerToggle: {
    backgroundColor: '#607d8b',
    marginTop: 12,
  },
  registerButton: {
    backgroundColor: '#4caf50',
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  imageWrapper: {
    width: IMAGE_PREVIEW_SIZE,
    height: IMAGE_PREVIEW_SIZE,
    marginVertical: 16,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ff4081',
  },
  faceLabel: {
    position: 'absolute',
    bottom: -18,
    left: 0,
    backgroundColor: '#ff4081',
    color: 'white',
    paddingHorizontal: 4,
    fontSize: 11,
    borderRadius: 4,
  },
  registerForm: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginVertical: 12,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  section: {
    width: '100%',
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  noResult: {
    fontStyle: 'italic',
    color: '#777',
  },
  resultText: {
    paddingVertical: 4,
    fontSize: 15,
  },
});
