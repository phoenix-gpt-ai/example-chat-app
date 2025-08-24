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
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { flushSync } from 'react-dom';
import './App.css';

/** Import necessary components. */
import ConversationDisplayArea from './components/ConversationDisplayArea.js';
import Header from './components/Header.js';
import MessageInput from './components/MessageInput.js';

function App() {
  /** Reference variable for message input button. */
  const inputRef = useRef();
  /** Host URL */
  const host = "https://example-chat-app.onrender.com"
  /** URL for non-streaming chat. */
  const url = host + "/chat";
  /** URL for streaming chat. */
  const streamUrl = host + "/stream";
  
  /** State variable for message history with persistence. */
  const [data, setData] = useState(() => {
    // Load chat history from localStorage on component initialization
    try {
      const savedHistory = localStorage.getItem('phoenixChatHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  });
  
  /** State variable for Temporary streaming block. */
  const [answer, setAnswer] = useState("")
  /** State variable to show/hide temporary streaming block. */
  const [streamdiv, showStreamdiv] = useState(false);
  
  /** State variable to toggle between streaming and non-streaming response with persistence. */
  const [toggled, setToggled] = useState(() => {
    // Load streaming preference from localStorage
    try {
      const savedToggle = localStorage.getItem('phoenixStreamingEnabled');
      return savedToggle ? JSON.parse(savedToggle) : false;
    } catch (error) {
      console.error('Error loading streaming preference:', error);
      return false;
    }
  });
  
  /** 
   * State variable used to block the user from inputting the next message until
   * the previous conversation is completed.
   */
  const [waiting, setWaiting] = useState(false);
  
  /** 
   * `is_stream` checks whether streaming is on or off based on the state of 
   * toggle button.
   */
  const is_stream = toggled;

  /** Save chat history to localStorage whenever data changes */
  useEffect(() => {
    try {
      localStorage.setItem('phoenixChatHistory', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [data]);

  /** Save streaming preference to localStorage whenever toggled changes */
  useEffect(() => {
    try {
      localStorage.setItem('phoenixStreamingEnabled', JSON.stringify(toggled));
    } catch (error) {
      console.error('Error saving streaming preference:', error);
    }
  }, [toggled]);

  /** Function to clear chat history */
  const clearChatHistory = () => {
    setData([]);
    try {
      localStorage.removeItem('phoenixChatHistory');
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  /** Function to scroll smoothly to the top of the mentioned checkpoint. */
  function executeScroll() {
    const element = document.getElementById('checkpoint');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /** Function to validate user input. */
  function validationCheck(str, file) {
    // If there's a file, it's valid even if text is empty
    if (file) return false;
    // If no file, check if text is valid
    return str === null || str.match(/^\s*$/) !== null;
  }

  /** Handle form submission with optional file. */
  const handleClick = (selectedFile = null) => {
    const userMessage = inputRef.current.value;
    
    if (validationCheck(userMessage, selectedFile)) {
      console.log("Empty or invalid entry and no file selected");
      return;
    }

    if (!is_stream) {
      /** Handle non-streaming chat. */
      handleNonStreamingChat(selectedFile);
    } else {
      /** Handle streaming chat. */
      handleStreamingChat(selectedFile);
    }
  };

  /** Create FormData for file upload or regular data object. */
  const createRequestData = (file) => {
    const userMessage = inputRef.current.value.trim();
    
    if (file) {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('chat', userMessage);
      formData.append('history', JSON.stringify(data));
      formData.append('file', file);
      return { data: formData, isFile: true, headers: {} };
    } else {
      // Regular JSON data
      return { 
        data: {
          chat: userMessage,
          history: data
        }, 
        isFile: false,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          "Access-Control-Allow-Origin": "*",
        }
      };
    }
  };

  /** Handle non-streaming chat with optional file upload. */
  const handleNonStreamingChat = async (selectedFile = null) => {
    const userMessage = inputRef.current.value.trim();
    
    /** Add current user message to history. */
    const ndata = [...data,
      {"role": "user", "parts":[{"text": userMessage || "Document uploaded"}]}]

    /**
     * Re-render DOM with updated history.
     * Clear the input box and temporarily disable input.
     */
    flushSync(() => {
        setData(ndata);
        inputRef.current.value = ""
        inputRef.current.placeholder = "Waiting for model's response"
        setWaiting(true)
    });

    /** Scroll to the new user message. */
    executeScroll();

    /** Prepare request data */
    const requestData = createRequestData(selectedFile);

    /** Function to perform request. */
    const fetchData = async() => {
      var modelResponse = ""
      try {
        const response = await axios.post(url, requestData.data, {
          headers: requestData.headers
        });
        
        modelResponse = response.data.text || "No response received";
      } catch (error) {
        if (error.response) {
          console.error('Response error:', error.response.data);
          modelResponse = `Error: ${error.response.data.error || 'Server error occurred'}`;
        } else if (error.request) {
          console.error('Network error:', error.request);
          modelResponse = "Network error. Please check your connection.";
        } else {
          console.error('Request error:', error.message);
          modelResponse = "Error occurred while processing your request.";
        }
      } finally {
        /** Add model response to the history. */
        const updatedData = [...ndata,
          {"role": "model", "parts":[{"text": modelResponse}]}]

        /**
         * Re-render DOM with updated history.
         * Enable input.
         */
        flushSync(() => {
          setData(updatedData);
          inputRef.current.placeholder = "Ask Phoenix..."
          setWaiting(false)
        });
        /** Scroll to the new model response. */
        executeScroll();
      }
    };

    fetchData();
  };

  /** Handle streaming chat with optional file upload. */
  const handleStreamingChat = async (selectedFile = null) => {
    const userMessage = inputRef.current.value.trim();
    
    /** Add current user message to history. */
    const ndata = [...data,
      {"role": "user", "parts":[{"text": userMessage || "Document uploaded"}]}]

    /**
     * Re-render DOM with updated history.
     * Clear the input box and temporarily disable input.
     */
    flushSync(() => {
      setData(ndata);
      inputRef.current.value = ""
      inputRef.current.placeholder = "Waiting for model's response"
      setWaiting(true)
    });

    /** Scroll to the new user message. */
    executeScroll();

    /** Prepare request data */
    const requestData = createRequestData(selectedFile);

    /** Function to perform streaming request. */
    const fetchStreamData = async() => {
      try {
        setAnswer("");
        
        const response = await fetch(streamUrl, {
          method: "POST",
          headers: requestData.headers,
          body: selectedFile ? requestData.data : JSON.stringify(requestData.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        /** 
         * Creates a reader using ReadableStream interface and locks the
         * stream to it.
         */
        const reader = response.body.getReader();
        /** Create a decoder to read the stream as JavaScript string. */
        const txtdecoder = new TextDecoder();
        const loop = true;
        var modelResponse = "";
        /** Activate the temporary div to show the streaming response. */
        showStreamdiv(true);

        /** Loop until the streaming response ends. */
        while (loop) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          /**
           * Decode the partial response received and update the temporary
           * div with it.
           */
          const decodedTxt = txtdecoder.decode(value, { stream: true });
          setAnswer((answer) => answer + decodedTxt);
          modelResponse = modelResponse + decodedTxt;
          executeScroll();
        }
      } catch (err) {
        modelResponse = `Error: ${err.message || 'Unknown error occurred'}`;
        console.error('Streaming Error:', err);
      } finally {
        /** Clear temporary div content. */
        setAnswer("")
        /** Add the complete model response to the history. */
        const updatedData = [...ndata,
          {"role": "model", "parts":[{"text": modelResponse}]}]
        /** 
         * Re-render DOM with updated history.
         * Enable input.
         */
        flushSync(() => {
          setData(updatedData);
          inputRef.current.placeholder = "Ask Phoenix..."
          setWaiting(false)
        });
        /** Hide temporary div used for streaming content. */
        showStreamdiv(false);
        /** Scroll to the new model response. */
        executeScroll();
      }
    };
    fetchStreamData();
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
      </div>
    </center>
  );
}

export default App;
