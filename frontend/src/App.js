import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputValue };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat', {
        messages: newMessages
      }, {
        timeout: 60000  // 60秒のタイムアウト
      });

      const aiMessage = response.data.message;
      setMessages([...newMessages, aiMessage]);
      
      // 使用量の表示（デバッグ用）
      if (response.data.usage) {
        console.log('Token usage:', response.data.usage);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = 'エラーが発生しました。もう一度お試しください。';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'リクエストがタイムアウトしました。もう一度お試しください。';
      } else if (error.response?.status === 429) {
        errorMessage = 'リクエスト制限に達しました。しばらくお待ちください。';
      }
      
      setMessages([...newMessages, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <Bot className="header-icon" />
            <h1>Azure OpenAI Chat</h1>
          </div>
          <button onClick={clearChat} className="clear-button">
            チャットをクリア
          </button>
        </div>
      </header>

      <main className="chat-container">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <Bot className="welcome-icon" />
              <h2>Azure OpenAI Chatへようこそ</h2>
              <p>何でもお気軽にお聞きください</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-icon">
                {message.role === 'user' ? <User /> : <Bot />}
              </div>
              <div className="message-content">
                {message.role === 'user' ? (
                  <div className="user-message">{message.content}</div>
                ) : (
                  <div className="assistant-message">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant">
              <div className="message-icon">
                <Bot />
              </div>
              <div className="message-content">
                <div className="loading-indicator">
                  <Loader2 className="loading-spinner" />
                  <span>考え中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メッセージを入力してください..."
              className="message-input"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="send-button"
            >
              <Send />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;