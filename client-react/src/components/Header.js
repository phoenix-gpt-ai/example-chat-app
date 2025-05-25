import React from 'react';

const Header = ({ toggled, setToggled, clearChatHistory, hasHistory }) => {
  return (
    <div className="chat-header">
      <h1>Phoenix, by PhoenixGPT</h1>
      <div className="toggle-container">
        {hasHistory && (
          <button 
            className="clear-btn"
            onClick={clearChatHistory}
            aria-label="Clear chat history"
            title="Clear chat history"
          >
            🗑️
          </button>
        )}
        <span className='toggle-text'>Stream</span>
        <button 
          className={`toggle-btn ${toggled ? "toggled": ""}`}
          onClick={() => setToggled(!toggled)}
          aria-label={`Toggle streaming response ${toggled ? 'off' : 'on'}`}
        >
          <div className="toggle-hover">
            <div className='thumb'></div>
            <span className="toggle-hover-text">
              {toggled ? "Streaming On" : "Streaming Off"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Header;
