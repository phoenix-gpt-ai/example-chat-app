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
import FileUpload from './components/FileUpload.js';

function App() {
  /** Reference variable for message input button. */
  const inputRef = useRef();
  /** Host URL */
  const host = "https://example-chat-app.onrender.com"
  /** URL for non-streaming chat. */
  const url = host + "/chat";
  /** URL for streaming chat. */
  const streamUrl = host + "/stream";
  /** URL for file upload. */
  const uploadUrl = host + "/upload";
  
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
  
  /** File upload related state variables */
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileContent, setFileContent] = useState('');
  
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

  /** Handle file upload */
  const handleFileUpload = async (file) => {
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        setUploadedFile(response.data.file_info);
        setFileContent(response.data.file_info.content);
        console.log('File uploaded successfully:', response.data.file_info);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  /** Remove uploaded file */
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileContent('');
  };

  /** Function to scroll smoothly to the top of the mentioned checkpoint. */
  function executeScroll() {
    const element = document.getElementById('checkpoint');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /** Function to validate user input. */
  function validationCheck(str) {
    return str === null || str.match(/^\s*$/) !== null;
  }

  /** Handle form submission. */
  const handleClick = () => {
    if (validationCheck(inputRef.current.value)) {
      console.log("Empty or invalid entry");
    } else {
      if (!is_stream) {
        /** Handle non-streaming chat. */
        handleNonStreamingChat();
      } else {
        /** Handle streaming chat. */
        handleStreamingChat();
      }
    }
  };

  /** Handle non-streaming chat. */
  const handleNonStreamingChat = async () => {
    /** Prepare POST request data. */
    const chatData = {
      chat: inputRef.current.value,
      history: data,
      file_content: fileContent
    };

    /** Add current user message to history. */
    const ndata = [...data,
      {"role": "user", "parts":[{"text": inputRef.current.value}]}]

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

    /** Headers for the POST request. */
    let headerConfig = {
      headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          "Access-Control-Allow-Origin": "*",
      }
    };

    /** Function to perform POST request. */
    const fetchData = async() => {
      var modelResponse = ""
      try {
        const response = await axios.post(url, chatData, headerConfig);
        modelResponse = response.data.text
      } catch (error) {
        modelResponse = "Error occurred";
        console.error('API Error:', error);
      }finally {
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

  /** Handle streaming chat. */
  const handleStreamingChat = async () => {
    /** Prepare POST request data. */
    const chatData = {
      chat: inputRef.current.value,
      history: data,
      file_content: fileContent
    };

    /** Add current user message to history. */
    const ndata = [...data,
      {"role": "user", "parts":[{"text": inputRef.current.value}]}]

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

    /** Headers for the POST request. */
    let headerConfig = {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
    }

    /** Function to perform POST request. */
    const fetchStreamData = async() => {
      try {
        setAnswer("");
        const response = await fetch(streamUrl, {
          method: "post",
          headers: headerConfig,
          body: JSON.stringify(chatData),
        });

        if (!response.ok || !response.body) {
          throw response.statusText;
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
        modelResponse = "Error occurred";
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

// Replace the return statement in your App.js with this:

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
      <MessageInput 
        inputRef={inputRef} 
        waiting={waiting} 
        handleClick={handleClick}
        onFileUpload={handleFileUpload}
        uploadedFile={uploadedFile}
        onRemoveFile={handleRemoveFile}
        isUploading={isUploading}
      />
    </div>
  </center>
);

export default App;
