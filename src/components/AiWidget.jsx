import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaRobot, FaUser, FaBook, FaTrash, FaSpinner, FaLightbulb } from 'react-icons/fa6';
import { FaHistory, FaBookmark, FaRegBookmark, FaDownload, FaSearch, FaChevronLeft, FaTimes, FaStar, FaListUl } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { notifyChatExport } from '../lib/emailNotifications';
import './AiWidget.css';

const HF_KEY = import.meta.env.VITE_HF_API_KEY;
// Using a conversational model
const HF_MODEL = 'microsoft/DialoGPT-medium';
const HF_TEXT_MODEL = 'google/flan-t5-large';

const AiWidget = ({ externalOpen, onToggle }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookContext, setBookContext] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [activeView, setActiveView] = useState('chat'); 
  const [chatHistory, setChatHistory] = useState([]);
  const [bookmarkedMessages, setBookmarkedMessages] = useState([]);
  const [readingList, setReadingList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('ai_chat_history');
      if (savedHistory) setChatHistory(JSON.parse(savedHistory));
      const savedBookmarks = localStorage.getItem('ai_bookmarks');
      if (savedBookmarks) setBookmarkedMessages(JSON.parse(savedBookmarks));
      const savedReadingList = localStorage.getItem('ai_reading_list');
      if (savedReadingList) setReadingList(JSON.parse(savedReadingList));
    } catch (e) { console.error('Error loading AI data:', e); }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('ai_bookmarks', JSON.stringify(bookmarkedMessages)); } catch {}
  }, [bookmarkedMessages]);
  
  useEffect(() => {
    try { localStorage.setItem('ai_reading_list', JSON.stringify(readingList)); } catch {}
  }, [readingList]);

  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  const toggleOpen = () => {
    const newState = !open;
    setOpen(newState);
    if (onToggle) onToggle(newState);
  };

  const saveToHistory = useCallback(() => {
    if (messages.length <= 1) return;
    
    // Get the first user message of THIS conversation for the preview
    const userMessages = messages.filter(m => m.role === 'user');
    const preview = userMessages.length > 0 
      ? userMessages[0].content.slice(0, 60) 
      : 'Conversation';
    
    const conversation = {
      id: currentConversationId || Date.now(),
      date: new Date().toISOString(),
      messages: messages,
      preview: preview,
      messageCount: userMessages.length
    };
    setChatHistory(prev => {
      // Remove existing entry for this conversation if it was loaded from history
      const filtered = currentConversationId 
        ? prev.filter(c => c.id !== currentConversationId) 
        : prev;
      const updated = [conversation, ...filtered].slice(0, 50);
      try { localStorage.setItem('ai_chat_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [messages, currentConversationId]);

  const toggleBookmark = (msg) => {
    setBookmarkedMessages(prev => {
      const exists = prev.find(b => b.id === msg.id);
      if (exists) return prev.filter(b => b.id !== msg.id);
      return [...prev, { ...msg, bookmarkedAt: new Date().toISOString() }];
    });
  };

  const addToReadingList = (book) => {
    const info = book.volumeInfo || book;
    const entry = {
      id: book.id || Date.now(),
      title: info.title || 'Unknown',
      authors: info.authors || [],
      thumbnail: info.imageLinks?.smallThumbnail || info.imageLinks?.thumbnail,
      addedAt: new Date().toISOString()
    };
    setReadingList(prev => {
      if (prev.find(b => b.id === entry.id)) return prev;
      return [...prev, entry];
    });
  };

  const removeFromReadingList = (bookId) => {
    setReadingList(prev => prev.filter(b => b.id !== bookId));
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role === 'user' ? 'You' : t('bookAI')}: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `book-ai-chat-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    // Queue email notification
    if (user?.id) {
      notifyChatExport(user.id).catch(() => {});
    }
  };

  const loadConversation = (conversation) => {
    setMessages(conversation.messages);
    setCurrentConversationId(conversation.id);
    setActiveView('chat');
  };

  const deleteFromHistory = (id) => {
    setChatHistory(prev => {
      const updated = prev.filter(c => c.id !== id);
      try { localStorage.setItem('ai_chat_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

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
        content: t('aiGreeting')
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
          let response = t('booksFound') + '\n\n';
          const bookResults = books.slice(0, 3).map((book, idx) => {
            const info = book.volumeInfo;
            return {
              text: `${idx + 1}. **${info.title}** by ${(info.authors || []).join(', ') || 'Unknown'}\n   ${info.categories?.[0] || 'General'} • ${info.publishedDate || ''}`,
              book
            };
          });
          response += bookResults.map(b => b.text).join('\n\n');
          response += '\n\n' + t('clickBookForDetails');
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
      return { response: t('aiModelWarming') };
    }
    
    if (aiResponse) {
      return { response: aiResponse };
    }
    
    // Fallback response
    return { 
      response: t('aiFallback') 
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
    setMessageCount(prev => prev + 1);
    
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
        content: t('aiErrorRetry')
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
    saveToHistory();
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: t('chatCleared')
    }]);
    setBookContext(null);
    setMessageCount(0);
    setCurrentConversationId(null);
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`, { state: { book } });
    setOpen(false);
  };

  const quickPrompts = [
    "Recommend fantasy books",
    "Tell me about 1984",
    "Best mystery novels",
    "Top sci-fi books of all time",
    "Books similar to Harry Potter",
    "Who wrote The Great Gatsby?"
  ];

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return t('today');
    if (diff < 172800000) return t('yesterday');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Render the sidebar views (history, bookmarks, reading list)
  const renderSideView = () => {
    if (activeView === 'history') {
      return (
        <div className="ai-side-view">
          <div className="side-view-header">
            <button className="back-btn" onClick={() => setActiveView('chat')}><FaChevronLeft /></button>
            <h3><FaHistory /> {t('chatHistory')}</h3>
          </div>
          <div className="side-view-content">
            {chatHistory.length === 0 ? (
              <div className="side-empty">
                <FaHistory className="empty-icon" />
                <p>{t('noChatHistory')}</p>
                <span>{t('conversationsAppearHere')}</span>
              </div>
            ) : (
              chatHistory.map(conv => (
                <div key={conv.id} className="history-item" onClick={() => loadConversation(conv)}>
                  <div className="history-info">
                    <p className="history-preview">{conv.preview}</p>
                    <span className="history-meta">{formatDate(conv.date)} · {conv.messageCount} {t('messagesLabel')}</span>
                  </div>
                  <button className="history-delete" onClick={(e) => { e.stopPropagation(); deleteFromHistory(conv.id); }}><FaTrash /></button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeView === 'bookmarks') {
      return (
        <div className="ai-side-view">
          <div className="side-view-header">
            <button className="back-btn" onClick={() => setActiveView('chat')}><FaChevronLeft /></button>
            <h3><FaBookmark /> {t('savedMessages')}</h3>
          </div>
          <div className="side-view-content">
            {bookmarkedMessages.length === 0 ? (
              <div className="side-empty">
                <FaBookmark className="empty-icon" />
                <p>{t('noBookmarkedMessages')}</p>
                <span>{t('clickBookmarkToSave')}</span>
              </div>
            ) : (
              bookmarkedMessages.map(msg => (
                <div key={msg.id} className="bookmark-item">
                  <div className="bookmark-role">{msg.role === 'user' ? <FaUser /> : <FaRobot />}</div>
                  <div className="bookmark-content">
                    <p>{msg.content.slice(0, 150)}{msg.content.length > 150 ? '...' : ''}</p>
                    <span className="bookmark-date">{formatDate(msg.bookmarkedAt)}</span>
                  </div>
                  <button className="bookmark-remove" onClick={() => toggleBookmark(msg)}><FaTimes /></button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeView === 'readingList') {
      return (
        <div className="ai-side-view">
          <div className="side-view-header">
            <button className="back-btn" onClick={() => setActiveView('chat')}><FaChevronLeft /></button>
            <h3><FaListUl /> {t('aiReadingList')}</h3>
          </div>
          <div className="side-view-content">
            {readingList.length === 0 ? (
              <div className="side-empty">
                <FaListUl className="empty-icon" />
                <p>{t('noBooksInList')}</p>
                <span>{t('addBooksFromRecommendations')}</span>
              </div>
            ) : (
              readingList.map(book => (
                <div key={book.id} className="reading-list-item" onClick={() => navigate(`/book/${book.id}`)}>
                  {book.thumbnail && <img src={book.thumbnail} alt={book.title} className="reading-list-cover" />}
                  <div className="reading-list-info">
                    <p className="reading-list-title">{book.title}</p>
                    <span className="reading-list-author">{book.authors?.join(', ') || 'Unknown'}</span>
                  </div>
                  <button className="reading-list-remove" onClick={(e) => { e.stopPropagation(); removeFromReadingList(book.id); }}><FaTimes /></button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="ai-widget-root">
      <button
        className={`ai-fab ${open ? 'active' : ''}`}
        onClick={toggleOpen}
        title={t('chatWithAI')}
      >
        <FaRobot />
        {messageCount > 0 && !open && <span className="ai-msg-badge">{messageCount}</span>}
      </button>

      {open && (
        <div className="ai-chat-modal" role="dialog" aria-modal="true">
          <div className="ai-chat-container">
            {/* Header */}
            <div className="ai-chat-header">
              <div className="ai-chat-title">
                <FaRobot className="header-icon" />
                <div>
                  <h3>{t('bookAI')}</h3>
                  <span className="status">{t('onlineStatus')}</span>
                </div>
              </div>
              <div className="header-actions">
                <button className="header-action-btn" onClick={() => setActiveView(activeView === 'history' ? 'chat' : 'history')} title={t('chatHistory')}>
                  <FaHistory />
                </button>
                <button className="header-action-btn" onClick={() => setActiveView(activeView === 'bookmarks' ? 'chat' : 'bookmarks')} title={t('savedMessages')}>
                  <FaBookmark />
                </button>
                <button className="header-action-btn" onClick={() => setActiveView(activeView === 'readingList' ? 'chat' : 'readingList')} title={t('readingListAI')}>
                  <FaListUl />
                  {readingList.length > 0 && <span className="action-badge">{readingList.length}</span>}
                </button>
                <button className="header-action-btn" onClick={() => setShowSearch(!showSearch)} title={t('search')}>
                  <FaSearch />
                </button>
                <button className="header-action-btn" onClick={exportChat} title={t('exportChat')} disabled={messages.length <= 1}>
                  <FaDownload />
                </button>
                <button className="clear-btn" onClick={clearChat} title={t('newChat')}>
                  <FaTrash />
                </button>
                <button className="close-btn" onClick={() => { setOpen(false); if (onToggle) onToggle(false); }}>×</button>
              </div>
            </div>

            {/* Search Bar */}
            {showSearch && activeView === 'chat' && (
              <div className="ai-search-bar">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder={t('searchInConversation')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && <button onClick={() => setSearchQuery('')}><FaTimes /></button>}
              </div>
            )}

            {/* Side Views */}
            {activeView !== 'chat' && renderSideView()}

            {/* Chat View */}
            {activeView === 'chat' && (
              <>
                {/* Messages */}
                <div className="ai-chat-messages">
                  {filteredMessages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.role}`}>
                      <div className="message-avatar">
                        {msg.role === 'user' ? <FaUser /> : <FaRobot />}
                      </div>
                      <div className="message-content">
                        <div className="message-text">{msg.content}</div>
                        
                        {/* Message actions */}
                        <div className="msg-actions">
                          <button 
                            className={`msg-action-btn ${bookmarkedMessages.find(b => b.id === msg.id) ? 'bookmarked' : ''}`}
                            onClick={() => toggleBookmark(msg)}
                            title={bookmarkedMessages.find(b => b.id === msg.id) ? t('removeBookmark') : t('bookmark')}
                          >
                            {bookmarkedMessages.find(b => b.id === msg.id) ? <FaBookmark /> : <FaRegBookmark />}
                          </button>
                        </div>

                        {/* Single book action */}
                        {msg.book && (
                          <div className="book-result-actions">
                            <button 
                              className="book-action-btn"
                              onClick={() => handleBookClick(msg.book)}
                            >
                              <FaBook /> {t('viewDetails')}
                            </button>
                            <button 
                              className="book-action-btn add-reading"
                              onClick={() => addToReadingList(msg.book)}
                              title={t('addToReadingList')}
                            >
                              <FaListUl /> {t('addToListBtn')}
                            </button>
                          </div>
                        )}
                        
                        {/* Multiple books */}
                        {msg.books && msg.books.length > 0 && (
                          <div className="book-actions">
                            {msg.books.map((book, idx) => (
                              <div key={idx} className="book-chip-group">
                                <button 
                                  className="book-chip"
                                  onClick={() => handleBookClick(book)}
                                >
                                  📚 {book.volumeInfo?.title?.slice(0, 25)}{book.volumeInfo?.title?.length > 25 ? '...' : ''}
                                </button>
                                <button 
                                  className="chip-add-btn"
                                  onClick={() => addToReadingList(book)}
                                  title="Add to reading list"
                                >
                                  +
                                </button>
                              </div>
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
                    placeholder={t('askAboutBooks')}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiWidget;
