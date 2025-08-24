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

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { flushSync } from 'react-dom';
import './App.css';

import ConversationDisplayArea from './components/ConversationDisplayArea.js';
import Header from './components/Header.js';
import MessageInput from './components/MessageInput.js';

function App() {
  const inputRef = useRef();
  const host = "https://example-chat-app.onrender.com";
  const url = host + "/chat";
  const streamUrl = host + "/stream";

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
  const [errorMessage, setErrorMessage] = useState(""); // Added for user feedback

  const is_stream = toggled;

  useEffect(() => {
    try {
      localStorage.setItem('phoenixChatHistory', JSON.stringify(data));
    } catch {}
  }, [data]);

  useEffect(() => {
    try {
      localStorage.setItem('phoenixStreamingEnabled', JSON.stringify(toggled));
    } catch {}
  }, [toggled]);

  const clearChatHistory = () => {
    setData([]);
    try {
      localStorage.removeItem('phoenixChatHistory');
    } catch {}
  };

  function executeScroll() {
    const element = document.getElementById('checkpoint');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function validationCheck(str, file) {
    console.log('validationCheck - str:', str, 'file:', file); // Debug log
    // If a file is provided, input is valid
    if (file) return false;
    // If no file, check if the string is null, undefined, or only whitespace
    return !str || str.match(/^\s*$/) !== null;
  }

  const handleClick = (selectedFile = null) => {
    const userMessage = inputRef.current?.value; // Safe access
    console.log('handleClick - userMessage:', userMessage, 'selectedFile:', selectedFile); // Debug log
    if (validationCheck(userMessage, selectedFile)) {
      setErrorMessage("Please enter a message or upload a file.");
      return;
    }

    setErrorMessage(""); // Clear any previous error
    if (!is_stream) {
      handleNonStreamingChat(selectedFile);
    } else {
      handleStreamingChat(selectedFile);
    }
  };

  const createRequestData = (file) => {
    const userMessage = inputRef.current?.value || "";
    console.log('createRequestData - userMessage:', userMessage, 'file:', file); // Debug log
    if (file) {
      const formData = new FormData();
      formData.append('chat', userMessage);
      formData.append('history', JSON.stringify(data));
      formData.append('file', file);
      return { data: formData, isFile: true };
    } else {
      return {
        data: { chat: userMessage, history: data },
        isFile: false
      };
    }
  };

  const handleNonStreamingChat = async (selectedFile = null) => {
    const userMessage = inputRef.current?.value || "";
    const ndata = [...data, { role: "user", parts: [{ text: userMessage }] }];

    flushSync(() => {
      setData(ndata);
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.placeholder = "Waiting for model's response";
      }
      setWaiting(true);
    });

    executeScroll();

    const requestData = createRequestData(selectedFile);

    try {
      const response = await axios.post(
        url,
        requestData.isFile ? requestData.data : requestData.data,
        requestData.isFile
          ? {} // browser sets FormData headers
          : { headers: { "Content-Type": "application/json" } }
      );
      const modelResponse = response.data.text || response.data;

      const updatedData = [...ndata, { role: "model", parts: [{ text: modelResponse }] }];
      flushSync(() => {
        setData(updatedData);
        if (inputRef.current) {
          inputRef.current.placeholder = "Ask Phoenix...";
        }
        setWaiting(false);
      });
      executeScroll();
    } catch (error) {
      console.error("API Error:", error);
      const updatedData = [...ndata, { role: "model", parts: [{ text: "Error occurred while processing your request." }] }];
      flushSync(() => {
        setData(updatedData);
        if (inputRef.current) {
          inputRef.current.placeholder = "Ask Phoenix...";
        }
        setWaiting(false);
      });
      executeScroll();
    }
  };

  const handleStreamingChat = async (selectedFile = null) => {
    const userMessage = inputRef.current?.value || "";
    const ndata = [...data, { role: "user", parts: [{ text: userMessage }] }];

    flushSync(() => {
      setData(ndata);
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.placeholder = "Waiting for model's response";
      }
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

      setAnswer("");
      const updatedData = [...ndata, { role: "model", parts: [{ text: modelResponse }] }];
      flushSync(() => {
        setData(updatedData);
        if (inputRef.current) {
          inputRef.current.placeholder = "Ask Phoenix...";
        }
        setWaiting(false);
      });
      showStreamdiv(false);
      executeScroll();
    } catch (err) {
      console.error("Streaming Error:", err);
      const updatedData = [...ndata, { role: "model", parts: [{ text: "Error occurred while processing your request." }] }];
      flushSync(() => {
        setData(updatedData);
        if (inputRef.current) {
          inputRef.current.placeholder = "Ask Phoenix...";
        }
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
