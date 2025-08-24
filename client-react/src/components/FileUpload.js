{uploadedFile && (
        <div className="attached-file-info">
          <div className="file-bubble">
            <div className="file-details">
              <span className="file-name">{uploadedFile.filename}</span>
              <span className="file-size">{formatFileSize(uploadedFile.size)}</span>
            </div>
            <button 
              className="remove-file-btn"
              onClick={onRemoveFile}
              title="Remove file"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
      )}import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faTimes, faFileWord } from '@fortawesome/free-solid-svg-icons';

const FileUpload = ({ onFileUpload, uploadedFile, onRemoveFile, isUploading }) => {
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
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-compact">
      <input
        type="file"
        id="file-upload-compact"
        accept=".doc,.docx"
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={isUploading}
      />
      
      <label 
        htmlFor="file-upload-compact" 
        className={`file-upload-btn ${isUploading ? 'uploading' : ''} ${uploadedFile ? 'has-file' : ''}`}
        title={uploadedFile ? `Attached: ${uploadedFile.filename}` : 'Attach Word document'}
      >
        <FontAwesomeIcon 
          icon={uploadedFile ? faFileWord : faPaperclip} 
          className="file-icon" 
        />
        {isUploading && <div className="upload-spinner"></div>}
      </label>


    </div>
  );
};

export default FileUpload;
