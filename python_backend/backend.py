from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from deepface import DeepFace
import sqlite3
import os
from scipy.spatial.distance import cosine  # <-- FIXED: Import cosine

app = Flask(__name__)
CORS(app)

# Database setup
DATABASE = 'faces.db'

def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
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
            return jsonify({'error': 'Image is required'}), 400

        img = decode_image(image_data)

        # Represent all faces in the image
        results = DeepFace.represent(
            img_path=img,
            model_name='Facenet',
            detector_backend='retinaface',
            enforce_detection=False
        )

        print("Faces detected:", len(results))  # Log detected faces

        # Get known embeddings from the DB
        known_embeddings = []
        with get_db() as db:
            cursor = db.execute('SELECT name, embedding FROM persons')
            for row in cursor:
                name = row['name']
                embedding_blob = row['embedding']
                embedding = np.frombuffer(embedding_blob, dtype=np.float32)
                known_embeddings.append((name, embedding))
                print(f"{name}'s embedding length:", len(embedding))  # Debug

        if not known_embeddings:
            return jsonify({'error': 'No known faces in the database'}), 404

        # Compare each face in the image
        faces = []
        for face_data in results:
            embedding = np.array(face_data['embedding'])
            region = face_data['facial_area']

            # Optional: skip very small faces
            if region['w'] < 60 or region['h'] < 60:
                continue

            best_match = None
            min_distance = float('inf')

            for name, known_emb in known_embeddings:
                if embedding.shape != known_emb.shape:
                    print(f"Shape mismatch: {embedding.shape} vs {known_emb.shape}")
                    continue

                distance = cosine(embedding, known_emb)
                print(f"Compared with {name}, cosine distance: {distance:.4f}")

                if distance < min_distance:
                    min_distance = distance
                    best_match = name

            threshold = 0.45  # Loosened for group photos
            if min_distance <= threshold:
                matched_name = best_match
                confidence = round((1 - min_distance) * 100, 2)
            else:
                matched_name = "Unknown"
                confidence = 0

            faces.append({
                'name': matched_name,
                'confidence': confidence,
                'x': region['x'],
                'y': region['y'],
                'width': region['w'],
                'height': region['h']
            })

        return jsonify({
            'faces': faces,
            'image_width': img.shape[1],
            'image_height': img.shape[0]
        })

    except Exception as e:
        print("Error in recognize_faces:", e)
        return jsonify({'error': 'Face recognition failed'}), 500

@app.route('/get_persons', methods=['GET'])
def get_persons():
    with get_db() as db:
        cursor = db.execute('SELECT id, name FROM persons ORDER BY name')
        persons = [dict(row) for row in cursor]
        return jsonify(persons)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
