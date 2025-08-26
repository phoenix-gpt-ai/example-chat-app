import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileWord, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import userIcon from '../assets/user-icon.png';
// TODO: Consider replacing chatbotIcon with its own distinct icon.
import chatbotIcon from '../../public/logo92.png'

const ChatArea = ({ data, streamdiv, answer }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const copyStreamingResponse = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopiedIndex('streaming');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy streaming text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = answer;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedIndex('streaming');
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="chat-area">
      {data?.length <= 0 ? (
        <div className="welcome-area">
          <p className="welcome-1">Hi,</p>
          <p className="welcome-2">How can I help you today?</p>
        </div>
      ) : (
        <div className="welcome-area" style={{display: "none"}}></div>
      )}

      {data.map((element, index) => (
        <div key={index} className={element.role}>
          <img 
            src={element.role === "user" ? userIcon : chatbotIcon} 
            alt="Icon" 
          />
          <div className="message-content">
            {/* Display file attachment for user messages if present */}
            {element.role === "user" && element.file && (
              <div className="attached-file-display">
                <FontAwesomeIcon 
                  icon={element.file.type === 'docx' ? faFileWord : faPaperclip} 
                  className="file-display-icon" 
                />
                <div className="file-display-info">
                  <span className="file-display-name">{element.file.filename}</span>
                  <span className="file-display-size">{formatFileSize(element.file.size)}</span>
                </div>
              </div>
            )}
            <p><Markdown children={element.parts[0].text} /></p>
            {element.role === "model" && (
              <button 
                className="copy-btn"
                onClick={() => copyToClipboard(element.parts[0].text, index)}
                title={copiedIndex === index ? "Copied!" : "Copy response"}
                aria-label="Copy response to clipboard"
              >
                {copiedIndex === index ? "✓" : "📋"}
              </button>
            )}
          </div>
        </div>
      ))}

      {streamdiv && (
        <div className="tempResponse">
          <img src={chatbotIcon} alt="Icon" />
          <div className="message-content">
            {answer && <p><Markdown children={answer} /></p>}
            {answer && (
              <button 
                className="copy-btn"
                onClick={copyStreamingResponse}
                title={copiedIndex === 'streaming' ? "Copied!" : "Copy response"}
                aria-label="Copy response to clipboard"
              >
                {copiedIndex === 'streaming' ? "✓" : "📋"}
              </button>
            )}
          </div>
        </div>
      )}

      <span id="checkpoint"></span>
    </div>
  );
};

export default ChatArea;
