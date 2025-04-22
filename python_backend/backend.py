from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from deepface import DeepFace
import sqlite3
import os

app = Flask(__name__)
CORS(app)

# Database setup
DATABASE = 'faces.db'

def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    if not os.path.exists(DATABASE):
        with get_db() as db:
            db.execute('''
                CREATE TABLE IF NOT EXISTS persons (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    embedding BLOB NOT NULL
                )
            ''')
            db.commit()

init_db()

def decode_image(image_data):
    if image_data.startswith('data:image'):
        image_data = image_data.split(',')[1]
    image_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(image_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def find_closest_match(embedding, threshold=0.6):
    with get_db() as db:
        cursor = db.execute('SELECT id, name, embedding FROM persons')
        min_distance = float('inf')
        best_match = None
        
        for row in cursor:
            db_embedding = np.frombuffer(row['embedding'], dtype=np.float32)
            distance = np.linalg.norm(np.array(embedding) - db_embedding)
            
            if distance < min_distance and distance < threshold:
                min_distance = distance
                best_match = {
                    'id': row['id'],
                    'name': row['name'],
                    'distance': float(distance)
                }
        
        return best_match

@app.route('/register_face', methods=['POST'])
def register_face():
    try:
        data = request.get_json()
        name = data.get('name')
        image_data = data.get('image')
        
        if not name or not image_data:
            return jsonify({'error': 'Name and image are required'}), 400

        img = decode_image(image_data)
        if img is None:
            return jsonify({'error': 'Invalid image data'}), 400

        try:
            detection = DeepFace.represent(
                img_path=img,
                model_name='Facenet',
                detector_backend='retinaface',
                enforce_detection=True
            )
        except ValueError as e:
            return jsonify({'error': 'No face detected in the image'}), 400

        embedding = detection[0]['embedding']
        embedding_bytes = np.array(embedding, dtype=np.float32).tobytes()

        with get_db() as db:
            db.execute(
                'INSERT INTO persons (name, embedding) VALUES (?, ?)',
                (name, embedding_bytes)
            )
            db.commit()

        return jsonify({'success': True, 'name': name})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recognize_faces', methods=['POST'])
def recognize_faces():
    try:
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        img = decode_image(image_data)
        if img is None:
            return jsonify({'error': 'Invalid image data'}), 400

        try:
            detections = DeepFace.represent(
                img_path=img,
                model_name='Facenet',
                detector_backend='retinaface',
                enforce_detection=True
            )
        except ValueError as e:
            return jsonify({'error': 'No faces found in the image'}), 400

        recognized_faces = []
        for face in detections:
            match = find_closest_match(face['embedding'])
            recognized_faces.append({
                'x': face['facial_area']['x'],
                'y': face['facial_area']['y'],
                'width': face['facial_area']['w'],
                'height': face['facial_area']['h'],
                'name': match['name'] if match else 'Unknown',
                'confidence': 1 - match['distance'] if match else 0
            })

        return jsonify({
            'faces': recognized_faces,
            'image_width': img.shape[1],
            'image_height': img.shape[0]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_persons', methods=['GET'])
def get_persons():
    with get_db() as db:
        cursor = db.execute('SELECT id, name FROM persons ORDER BY name')
        persons = [dict(row) for row in cursor]
        return jsonify(persons)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)