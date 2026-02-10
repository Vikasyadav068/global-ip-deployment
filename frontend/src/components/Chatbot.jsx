import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader, Bot, User, Sparkles } from 'lucide-react';
import './Chatbot.css';
import { API_BASE_URL } from '../config/api';

const Chatbot = ({ userId, userProfile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Generate session ID on mount
  useEffect(() => {
    const generateSessionId = () => {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };
    setSessionId(generateSessionId());
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chatbot opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText = null) => {
    const messageToSend = messageText || inputMessage.trim();
    
    if (!messageToSend) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      text: messageToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          userId: userId || 'anonymous',
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      // Add bot response to chat
      const botMessage = {
        id: Date.now() + 1,
        text: data.message,
        sender: 'bot',
        timestamp: new Date(),
        type: data.type,
        data: data.data,
        suggestions: data.suggestions,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again or contact support.',
        sender: 'bot',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (text) => {
    // Convert markdown-style formatting to HTML
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
    
    return { __html: formatted };
  };

  const renderMessage = (message) => {
    return (
      <div
        key={message.id}
        className={`chatbot-message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
      >
        <div className="message-avatar">
          {message.sender === 'user' ? (
            <User size={20} />
          ) : (
            <Bot size={20} />
          )}
        </div>
        <div className="message-content">
          <div
            className="message-text"
            dangerouslySetInnerHTML={formatMessage(message.text)}
          />
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="message-suggestions">
              {message.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-button"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <div className="message-timestamp">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Chatbot Button - Hidden when chatbot is open */}
      {!isOpen && (
        <button
          className={`chatbot-toggle-button`}
          onClick={() => setIsOpen(true)}
          aria-label="Open chatbot"
        >
          <div className="chatbot-icon-wrapper">
            <Bot size={28} />
            <Sparkles size={14} className="sparkle-icon" />
          </div>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-title">
              <div className="chatbot-header-icon">
                <Bot size={32} />
                <Sparkles size={12} className="header-sparkle-icon" />
              </div>
              <div>
                <h3>IPI Assistant</h3>
                <p>Ask me anything about the platform</p>
              </div>
            </div>
            <button
              className="chatbot-header-close-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-welcome">
                <Bot size={48} className="welcome-icon" />
                <h4>Welcome, {userProfile?.firstName || 'there'}! 👋</h4>
                <p>I can help you with:</p>
                <ul>
                  <li>Patent counts and statistics</li>
                  <li>Payment and subscription details</li>
                  <li>Dashboard features and navigation</li>
                  <li>Patent filing information</li>
                  <li>And much more!</li>
                </ul>
                <div className="quick-questions">
                  <p>Try asking:</p>
                  <button
                    className="quick-question-button"
                    onClick={() => handleSendMessage('How many patents are there?')}
                  >
                    How many patents are there?
                  </button>
                  <button
                    className="quick-question-button"
                    onClick={() => handleSendMessage('Show subscription plans')}
                  >
                    Show subscription plans
                  </button>
                  <button
                    className="quick-question-button"
                    onClick={() => handleSendMessage('What features are available?')}
                  >
                    What features are available?
                  </button>
                </div>
              </div>
            )}

            {messages.map(renderMessage)}

            {isLoading && (
              <div className="chatbot-message bot-message">
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className="chatbot-send-button"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              aria-label="Send message"
            >
              {isLoading ? <Loader size={20} className="spinner" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
