import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faTimes, faFileWord } from '@fortawesome/free-solid-svg-icons';

const FileUpload = ({ onFileUpload, uploadedFile, onRemoveFile, isUploading }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        onFileUpload(file);
      } else {
        alert('Please upload only .doc or .docx files');
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        onFileUpload(file);
      } else {
        alert('Please upload only .doc or .docx files');
      }
    }
  };

  const isValidFile = (file) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    return allowedTypes.includes(file.type) || 
           file.name.toLowerCase().endsWith('.docx') || 
           file.name.toLowerCase().endsWith('.doc');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadedFile) {
    return (
      <div className="uploaded-file-display">
        <div className="file-info">
          <FontAwesomeIcon icon={faFileWord} className="file-icon" />
          <div className="file-details">
            <span className="file-name">{uploadedFile.filename}</span>
            <span className="file-size">{formatFileSize(uploadedFile.size)}</span>
          </div>
          <button 
            className="remove-file-btn"
            onClick={onRemoveFile}
            aria-label="Remove file"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-upload-container">
      <div 
        className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept=".doc,.docx"
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={isUploading}
        />
        <label htmlFor="file-upload" className="file-upload-label">
          <FontAwesomeIcon icon={faUpload} className="upload-icon" />
          <span className="upload-text">
            {isUploading ? 'Uploading...' : 'Upload Word Document'}
          </span>
          <span className="upload-subtext">
            Drag & drop or click to select (.doc, .docx)
          </span>
        </label>
      </div>
    </div>
  );
};

export default FileUpload;
