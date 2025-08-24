/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Import necessary modules. */
import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPaperclip, faTimes } from '@fortawesome/free-solid-svg-icons';

/** Message input component with file upload support. */
const MessageInput = ({ inputRef, waiting, handleClick, handleFileClick }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      const allowedExtensions = ['.pdf', '.docx', '.txt'];
      
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)) {
        setSelectedFile(file);
      } else {
        alert('Please select a PDF, DOCX, or TXT file.');
        event.target.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    handleClick(selectedFile);
    // Clear file after sending
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="message-input">
      {/* File preview */}
      {selectedFile && (
        <div className="file-preview">
          <div className="file-info">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">({formatFileSize(selectedFile.size)})</span>
          </div>
          <button 
            className="remove-file-btn"
            onClick={handleRemoveFile}
            title="Remove file"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}
      
      <div className="input-controls">
        <input
          className="chat_msg_input"
          type="text"
          name="chat"
          placeholder={selectedFile ? "Ask something about the document..." : "Ask Phoenix..."}
          ref={inputRef}
          disabled={waiting}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
        />
        
        <button 
          className="file-btn" 
          onClick={() => fileInputRef.current?.click()}
          disabled={waiting}
          title="Upload file (PDF, DOCX, TXT)"
        >
          <FontAwesomeIcon icon={faPaperclip} />
        </button>
        
        <button className="chat_msg_btn" onClick={handleSubmit} disabled={waiting}>
          <span className="fa-span-send">
            <FontAwesomeIcon icon={faPaperPlane} />
          </span>
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
