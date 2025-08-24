# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from flask import (
    Flask,
    request,
    Response,
    stream_with_context,
    jsonify
)
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
import os
from werkzeug.utils import secure_filename

# File processing imports
import docx

# Load environment variables from a .env file located in the same directory.
load_dotenv()

# Initialize a Flask application. Flask is used to create and manage the web server.
app = Flask(__name__)

# Apply CORS to the Flask app which allows it to accept requests from all domains.
# This is especially useful during development and testing.
CORS(app)

# Configure file upload settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'doc', 'docx'}

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# WARNING: Do not share code with you API key hard coded in it.
# Configure the Google Generative AI's Google API key obtained
# from the environment variable. This key authenticates requests to the Gemini API.
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Initialize the generative model with the specified model name.
# This model will be used to process user inputs and generate responses.
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash-lite-preview-06-17",
    system_instruction=""" [KEEP YOUR EXISTING SYSTEM PROMPT HERE] """
)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_docx(file_path):
    try:
        doc = docx.Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        return f"Error reading DOCX: {str(e)}"

# New file upload endpoint
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Only .doc and .docx files are supported'}), 400
    
    try:
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Extract content from DOCX
        content = extract_text_from_docx(file_path)
        
        file_info = {
            'filename': filename,
            'type': 'docx',
            'size': os.path.getsize(file_path),
            'content': content
        }
        
        # Clean up file after processing
        os.remove(file_path)
        
        return jsonify({
            'success': True,
            'file_info': file_info,
            'message': f'File {filename} uploaded and processed successfully'
        })
        
    except Exception as e:
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

# Modified chat endpoint to handle files
@app.route('/chat', methods=['POST'])
def chat():
    """Processes user input and returns AI-generated responses.

    This function handles POST requests to the '/chat' endpoint. It expects a JSON payload
    containing a user message and an optional conversation history. It returns the AI's
    response as a JSON object.

    Args:
        None (uses Flask `request` object to access POST data)

    Returns:
        A JSON object with a key "text" that contains the AI-generated response.
    """
    # Parse the incoming JSON data into variables.
    data = request.json
    msg = data.get('chat', '')
    chat_history = data.get('history', [])
    file_content = data.get('file_content', '')

    # If there's file content, prepend it to the message
    if file_content:
        msg = f"Based on this document content:\n\n{file_content}\n\n{msg}"

    # Start a chat session with the model using the provided history.
    chat_session = model.start_chat(history=chat_history)

    # Send the latest user input to the model and get the response.
    response = chat_session.send_message(msg)

    return {"text": response.text}

@app.route("/stream", methods=["POST"])
def stream():
    """Streams AI responses for real-time chat interactions.

    This function initiates a streaming session with the Gemini AI model,
    continuously sending user inputs and streaming back the responses. It handles
    POST requests to the '/stream' endpoint with a JSON payload similar to the
    '/chat' endpoint.

    Args:
        None (uses Flask `request` object to access POST data)

    Returns:
        A Flask `Response` object that streams the AI-generated responses.
    """
    def generate():
        data = request.json
        msg = data.get('chat', '')
        chat_history = data.get('history', [])
        file_content = data.get('file_content', '')

        # If there's file content, prepend it to the message
        if file_content:
            msg = f"Based on this document content:\n\n{file_content}\n\n{msg}"

        chat_session = model.start_chat(history=chat_history)
        response = chat_session.send_message(msg, stream=True)

        for chunk in response:
            yield f"{chunk.text}"

    return Response(stream_with_context(generate()), mimetype="text/event-stream")

# Configure the server to run on port 9000.
if __name__ == '__main__':
    app.run(port=os.getenv("PORT"))
