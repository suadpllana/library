import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaRobot, FaUser, FaBook, FaTrash, FaSpinner, FaLightbulb } from 'react-icons/fa6';
import './AiWidget.css';

const HF_KEY = import.meta.env.VITE_HF_API_KEY;
// Using a conversational model
const HF_MODEL = 'microsoft/DialoGPT-medium';
const HF_TEXT_MODEL = 'google/flan-t5-large';

const AiWidget = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookContext, setBookContext] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Add initial greeting when opening chat for first time
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: "Hello! 👋 I'm your Book AI Assistant. Ask me anything about books - recommendations, summaries, author info, or search for specific titles. Try asking:\n\n• \"Tell me about 1984 by George Orwell\"\n• \"Recommend fantasy books\"\n• \"Who wrote Pride and Prejudice?\""
      }]);
    }
  }, [open]);

  // Simple cache for book searches
  const bookSearchCache = useRef(new Map());
  const SEARCH_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  const fetchGoogleBook = async (query) => {
    const cacheKey = query.toLowerCase().trim();
    
    // Check cache first
    const cached = bookSearchCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
      return cached.data;
    }

    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=3`);
      if (!res.ok) return null;
      const data = await res.json();
      const books = data.items || null;
      
      // Cache the result
      bookSearchCache.current.set(cacheKey, { data: books, timestamp: Date.now() });
      
      // Limit cache size
      if (bookSearchCache.current.size > 50) {
        const firstKey = bookSearchCache.current.keys().next().value;
        bookSearchCache.current.delete(firstKey);
      }
      
      return books;
    } catch (err) {
      console.error('Google Books fetch error', err);
      return null;
    }
  };

  const callHuggingFace = async (prompt, conversationHistory = []) => {
    if (!HF_KEY) {
      return null;
    }

    // Build context from conversation history
    const contextPrompt = conversationHistory.length > 0
      ? conversationHistory.slice(-4).map(m => 
          m.role === 'user' ? `Human: ${m.content}` : `Assistant: ${m.content}`
        ).join('\n') + `\nHuman: ${prompt}\nAssistant:`
      : prompt;

    const url = `https://api-inference.huggingface.co/models/${HF_TEXT_MODEL}`;
    const body = { 
      inputs: contextPrompt, 
      parameters: { 
        max_new_tokens: 250,
        temperature: 0.7,
        do_sample: true
      } 
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        console.error(`HF error: ${res.status}`);
        return null;
      }

      const data = await res.json();
      
      if (data.error?.includes('loading')) {
        return { loading: true };
      }
      
      if (Array.isArray(data)) {
        return data[0]?.generated_text || null;
      }
      return data.generated_text || null;
    } catch (err) {
      console.error('Hugging Face API error:', err);
      return null;
    }
  };

  const detectIntent = (message) => {
    const lower = message.toLowerCase();
    
    if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('similar to')) {
      return 'recommendation';
    }
    if (lower.includes('tell me about') || lower.includes('what is') || lower.includes('describe')) {
      return 'book_info';
    }
    if (lower.includes('who wrote') || lower.includes('author of')) {
      return 'author_query';
    }
    if (lower.includes('summary') || lower.includes('summarize') || lower.includes('plot')) {
      return 'summary';
    }
    if (lower.includes('search') || lower.includes('find') || lower.includes('look for')) {
      return 'search';
    }
    return 'general';
  };

  const extractBookTitle = (message) => {
    // Try to extract book title from various patterns
    const patterns = [
      /(?:about|for|called|titled|named)\s+["']?([^"'\n?]+?)["']?(?:\s+by|\s*\?|$)/i,
      /["']([^"']+)["']/,
      /(?:book|novel)\s+(.+?)(?:\s+by|\s*\?|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  const formatBookInfo = (book) => {
    const info = book.volumeInfo || {};
    const title = info.title || 'Unknown title';
    const authors = (info.authors || []).join(', ') || 'Unknown author';
    const publishedDate = info.publishedDate || 'Unknown date';
    const categories = (info.categories || []).join(', ') || 'General';
    const pageCount = info.pageCount;
    const rating = info.averageRating;
    const description = info.description;
    
    let response = `📚 **${title}**\n`;
    response += `✍️ by ${authors}\n`;
    if (publishedDate) response += `📅 ${publishedDate}\n`;
    if (categories !== 'General') response += `🏷️ ${categories}\n`;
    if (pageCount) response += `📖 ${pageCount} pages\n`;
    if (rating) response += `⭐ ${rating}/5\n`;
    
    if (description) {
      const shortDesc = description.length > 300 
        ? description.slice(0, 300) + '...' 
        : description;
      response += `\n${shortDesc}`;
    }
    
    return { response, book };
  };

  const generateResponse = async (userMessage) => {
    const intent = detectIntent(userMessage);
    const bookTitle = extractBookTitle(userMessage);
    
    // If we detect a book-related query, search Google Books
    if (intent !== 'general' || bookTitle) {
      const searchQuery = bookTitle || userMessage.replace(/^(tell me about|what is|describe|search for|find)\s*/i, '');
      const books = await fetchGoogleBook(searchQuery);
      
      if (books && books.length > 0) {
        if (intent === 'recommendation' || intent === 'search') {
          // Return multiple book suggestions
          let response = `Here are some books I found:\n\n`;
          const bookResults = books.slice(0, 3).map((book, idx) => {
            const info = book.volumeInfo;
            return {
              text: `${idx + 1}. **${info.title}** by ${(info.authors || []).join(', ') || 'Unknown'}\n   ${info.categories?.[0] || 'General'} • ${info.publishedDate || ''}`,
              book
            };
          });
          response += bookResults.map(b => b.text).join('\n\n');
          response += '\n\nClick on any book title to see more details!';
          return { response, books: bookResults.map(b => b.book) };
        } else {
          // Return detailed info about the first book
          const { response, book } = formatBookInfo(books[0]);
          setBookContext(book);
          return { response, book };
        }
      }
    }
    
    // Try AI response for general queries
    const aiResponse = await callHuggingFace(
      `You are a helpful book assistant. Answer this question about books: ${userMessage}`,
      messages
    );
    
    if (aiResponse?.loading) {
      return { response: "The AI model is warming up. Please try again in a moment! In the meantime, try asking about a specific book title." };
    }
    
    if (aiResponse) {
      return { response: aiResponse };
    }
    
    // Fallback response
    return { 
      response: "I couldn't find specific information for that. Try asking about a book by title, like \"Tell me about The Great Gatsby\" or \"Recommend mystery novels\"." 
    };
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    
    try {
      const result = await generateResponse(userMessage);
      
      // Add assistant message
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: result.response,
        book: result.book,
        books: result.books
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error generating response:', err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again!"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: "Chat cleared! How can I help you with books today?"
    }]);
    setBookContext(null);
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`, { state: { book } });
    setOpen(false);
  };

  const quickPrompts = [
    "Recommend fantasy books",
    "Tell me about 1984",
    "Best mystery novels"
  ];

  return (
    <div className="ai-widget-root">
      <button
        className="ai-fab"
        onClick={() => setOpen(!open)}
        title="Chat with AI"
      >
        <FaRobot />
      </button>

      {open && (
        <div className="ai-chat-modal" role="dialog" aria-modal="true">
          <div className="ai-chat-container">
            {/* Header */}
            <div className="ai-chat-header">
              <div className="ai-chat-title">
                <FaRobot className="header-icon" />
                <div>
                  <h3>Book AI</h3>
                  <span className="status">Online</span>
                </div>
              </div>
              <div className="header-actions">
                <button className="clear-btn" onClick={clearChat} title="Clear chat">
                  <FaTrash />
                </button>
                <button className="close-btn" onClick={() => setOpen(false)}>×</button>
              </div>
            </div>

            {/* Messages */}
            <div className="ai-chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? <FaUser /> : <FaRobot />}
                  </div>
                  <div className="message-content">
                    <div className="message-text">{msg.content}</div>
                    
                    {/* Single book action */}
                    {msg.book && (
                      <button 
                        className="book-action-btn"
                        onClick={() => handleBookClick(msg.book)}
                      >
                        <FaBook /> View Book Details
                      </button>
                    )}
                    
                    {/* Multiple books */}
                    {msg.books && msg.books.length > 0 && (
                      <div className="book-actions">
                        {msg.books.map((book, idx) => (
                          <button 
                            key={idx}
                            className="book-chip"
                            onClick={() => handleBookClick(book)}
                          >
                            📚 {book.volumeInfo?.title?.slice(0, 25)}{book.volumeInfo?.title?.length > 25 ? '...' : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="message assistant">
                  <div className="message-avatar"><FaRobot /></div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            {messages.length <= 1 && (
              <div className="quick-prompts">
                <FaLightbulb className="prompts-icon" />
                {quickPrompts.map((prompt, idx) => (
                  <button 
                    key={idx} 
                    className="quick-prompt"
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="ai-chat-input">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about any book..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
              <button 
                className="send-btn" 
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                {loading ? <FaSpinner className="spinner" /> : <FaPaperPlane />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiWidget;
