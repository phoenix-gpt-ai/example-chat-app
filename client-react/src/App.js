import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { flushSync } from 'react-dom';
import './App.css';

import ConversationDisplayArea from './components/ConversationDisplayArea.js';
import Header from './components/Header.js';
import MessageInput from './components/MessageInput.js';

function App() {
  const inputRef = useRef(null); // Initialize useRef with null
  console.log('App: inputRef initialized:', inputRef); // Debug ref initialization

  const host = "https://example-chat-app.onrender.com";
  const url = `${host}/chat`;
  const streamUrl = `${host}/stream`;

  const [data, setData] = useState(() => {
    try {
      const savedHistory = localStorage.getItem('phoenixChatHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch {
      return [];
    }
  });

  const [answer, setAnswer] = useState("");
  const [streamdiv, showStreamdiv] = useState(false);
  const [toggled, setToggled] = useState(() => {
    try {
      const savedToggle = localStorage.getItem('phoenixStreamingEnabled');
      return savedToggle ? JSON.parse(savedToggle) : false;
    } catch {
      return false;
    }
  });
  const [waiting, setWaiting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const is_stream = toggled;

  // Save chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('phoenixChatHistory', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [data]);

  // Save streaming toggle state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('phoenixStreamingEnabled', JSON.stringify(toggled));
    } catch (error) {
      console.error('Error saving streaming toggle:', error);
    }
  }, [toggled]);

  // Clear chat history
  const clearChatHistory = () => {
    setData([]);
    try {
      localStorage.removeItem('phoenixChatHistory');
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  // Scroll to the latest message
  function executeScroll() {
    const element = document.getElementById('checkpoint');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Validate input
  function validationCheck(str, file) {
    console.log('validationCheck - str:', str, 'file:', file);
    if (file) return false; // Valid if file is provided
    const trimmedStr = str?.trim(); // Trim whitespace
    return !trimmedStr; // Invalid if null, undefined, or empty after trimming
  }

  // Handle click event for sending message
  const handleClick = (selectedFile = null) => {
    if (!inputRef.current) {
      console.error('App: inputRef.current is null');
      setErrorMessage('Input field is not available. Please try again.');
      return;
    }
    const userMessage = inputRef.current.value || "";
    console.log('handleClick - userMessage:', userMessage, 'selectedFile:', selectedFile);

    if (validationCheck(userMessage, selectedFile)) {
      setErrorMessage("Please enter a message or upload a file.");
      return;
    }

    setErrorMessage("");
    if (!is_stream) {
      handleNonStreamingChat(selectedFile);
    } else {
      handleStreamingChat(selectedFile);
    }
  };

  // Create request data for API
  const createRequestData = (file) => {
    if (!inputRef.current) {
      console.error('App: inputRef.current is null in createRequestData');
      return { data: {}, isFile: false };
    }
    const userMessage = inputRef.current.value || "";
    console.log('createRequestData - userMessage:', userMessage, 'file:', file);
    if (file) {
      const formData = new FormData();
      formData.append('chat', userMessage);
      formData.append('history', JSON.stringify(data));
      formData.append('file', file);
      return { data: formData, isFile: true };
    }
    return {
      data: { chat: userMessage, history: data },
      isFile: false
    };
  };

  // Handle non-streaming chat
  const handleNonStreamingChat = async (selectedFile = null) => {
    if (!inputRef.current) {
      console.error('App: inputRef.current is null in handleNonStreamingChat');
      setErrorMessage('Input field is not available.');
      return;
    }
    const userMessage = inputRef.current.value || "";
    const ndata = [...data, { role: "user", parts: [{ text: userMessage }] }];

    flushSync(() => {
      setData(ndata);
      inputRef.current.value = "";
      inputRef.current.placeholder = "Waiting for model's response";
      setWaiting(true);
    });

    executeScroll();

    const requestData = createRequestData(selectedFile);

    try {
      const response = await axios.post(
        url,
        requestData.isFile ? requestData.data : requestData.data,
        requestData.isFile ? {} : { headers: { "Content-Type": "application/json" } }
      );
      const modelResponse = response.data.text || response.data;

      const updatedData = [...ndata, { role: "model", parts: [{ text: modelResponse }] }];
      flushSync(() => {
        setData(updatedData);
        inputRef.current.placeholder = "Ask Phoenix...";
        setWaiting(false);
      });
      executeScroll();
    } catch (error) {
      console.error("Non-Streaming API Error:", error);
      const updatedData = [...ndata, { role: "model", parts: [{ text: "Error occurred while processing your request." }] }];
      flushSync(() => {
        setData(updatedData);
        inputRef.current.placeholder = "Ask Phoenix...";
        setWaiting(false);
      });
      executeScroll();
    }
  };

  // Handle streaming chat
  const handleStreamingChat = async (selectedFile = null) => {
    if (!inputRef.current) {
      console.error('App: inputRef.current is null in handleStreamingChat');
      setErrorMessage('Input field is not available.');
      return;
    }
    const userMessage = inputRef.current.value || "";
    const ndata = [...data, { role: "user", parts: [{ text: userMessage }] }];

    flushSync(() => {
      setData(ndata);
      inputRef.current.value = "";
      inputRef.current.placeholder = "Waiting for model's response";
      setWaiting(true);
    });

    executeScroll();

    const { data: payload, isFile } = createRequestData(selectedFile);

    try {
      setAnswer("");
      showStreamdiv(true);

      const response = await fetch(streamUrl, {
        method: "POST",
        headers: isFile ? {} : { "Content-Type": "application/json" },
        body: isFile ? payload : JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(response.statusText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let modelResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setAnswer(prev => prev + chunk);
        modelResponse += chunk;
        executeScroll();
      }

      const updatedData = [...ndata, { role: "model", parts: [{ text: modelResponse }] }];
      flushSync(() => {
        setData(updatedData);
        inputRef.current.placeholder = "Ask Phoenix...";
        setWaiting(false);
      });
      showStreamdiv(false);
      executeScroll();
    } catch (error) {
      console.error("Streaming Error:", error);
      const updatedData = [...ndata, { role: "model", parts: [{ text: "Error occurred while processing your request." }] }];
      flushSync(() => {
        setData(updatedData);
        inputRef.current.placeholder = "Ask Phoenix...";
        setWaiting(false);
      });
      showStreamdiv(false);
      executeScroll();
    }
  };

  return (
    <center>
      <div className="chat-app">
        <Header
          toggled={toggled}
          setToggled={setToggled}
          clearChatHistory={clearChatHistory}
          hasHistory={data.length > 0}
        />
        <ConversationDisplayArea data={data} streamdiv={streamdiv} answer={answer} />
        <MessageInput inputRef={inputRef} waiting={waiting} handleClick={handleClick} />
        {errorMessage && <div style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</div>}
      </div>
    </center>
  );
}

export default App;
