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

import os
import io
import json
import PyPDF2
from docx import Document
from flask import Flask, request, Response, stream_with_context, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# File upload settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_stream):
    try:
        pdf_reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

def extract_text_from_docx(file_stream):
    try:
        doc = Document(file_stream)
        return "\n".join(p.text for p in doc.paragraphs).strip()
    except Exception as e:
        return f"Error reading DOCX: {str(e)}"

def extract_text_from_txt(file_stream):
    try:
        return file_stream.read().decode('utf-8').strip()
    except Exception as e:
        return f"Error reading TXT: {str(e)}"

def extract_text_from_file(file):
    filename = file.filename.lower()
    file_stream = io.BytesIO(file.read())
    if filename.endswith('.pdf'):
        return extract_text_from_pdf(file_stream)
    elif filename.endswith('.docx'):
        return extract_text_from_docx(file_stream)
    elif filename.endswith('.txt'):
        file_stream.seek(0)
        return extract_text_from_txt(file_stream)
    return "Unsupported file format"

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash-lite-preview-06-17",
    system_instruction="You are a helpful AI assistant."
)

@app.route('/chat', methods=['POST'])
def chat():
    try:
        msg = ""
        chat_history = []
        combined_message = ""
        has_file = False

        if request.files and 'file' in request.files:
            msg = (request.form.get('chat') or "").strip()
            history_str = request.form.get('history', '[]')
            try:
                chat_history = json.loads(history_str) if history_str else []
            except json.JSONDecodeError:
                chat_history = []

            file = request.files['file']
            if file and file.filename and allowed_file(file.filename):
                extracted_text = extract_text_from_file(file)
                has_file = True
                combined_message = (
                    f"Document content:\n{extracted_text}\n\nUser question: {msg}"
                    if msg else
                    f"Document content:\n{extracted_text}\n\nPlease analyze this document."
                )
            else:
                return jsonify({"error": "Invalid file format. Supported formats: PDF, DOCX, TXT"}), 400
        else:
            if not request.is_json:
                return jsonify({"error": "Content-Type not supported"}), 400
            data = request.get_json(silent=True) or {}
            msg = (data.get('chat') or "").strip()
            chat_history = data.get('history', [])
            combined_message = msg

        
        chat_session = model.start_chat(history=chat_history)
        response = chat_session.send_message(combined_message)
        return jsonify({"text": response.text})

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/stream", methods=["POST"])
def stream():
    def generate():
        try:
            msg = ""
            chat_history = []
            combined_message = ""
            has_file = False

            if request.files and 'file' in request.files:
                msg = (request.form.get('chat') or "").strip()
                history_str = request.form.get('history', '[]')
                try:
                    chat_history = json.loads(history_str) if history_str else []
                except json.JSONDecodeError:
                    chat_history = []
                file = request.files['file']
                if file and file.filename and allowed_file(file.filename):
                    extracted_text = extract_text_from_file(file)
                    has_file = True
                    combined_message = (
                        f"Document content:\n{extracted_text}\n\nUser question: {msg}"
                        if msg else
                        f"Document content:\n{extracted_text}\n\nPlease analyze this document."
                    )
                else:
                    yield "Error: Invalid file format. Supported formats: PDF, DOCX, TXT"
                    return
            else:
                if not request.is_json:
                    yield "Error: Content-Type not supported"
                    return
                data = request.get_json(silent=True) or {}
                msg = (data.get('chat') or "").strip()
                chat_history = data.get('history', [])
                combined_message = msg

            

            chat_session = model.start_chat(history=chat_history)
            response = chat_session.send_message(combined_message, stream=True)

            for chunk in response:
                yield chunk.text

        except Exception as e:
            print(f"Error in stream endpoint: {str(e)}")
            yield f"Error: {str(e)}"

    return Response(
        stream_with_context(generate()),
        mimetype="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

if __name__ == '__main__':
    app.run(port=int(os.getenv("PORT")))
