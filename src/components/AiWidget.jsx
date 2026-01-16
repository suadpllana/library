import React, { useState } from 'react';
import './AiWidget.css';

const HF_MODEL = import.meta.env.VITE_HF_MODEL || 'google/flan-t5-base';
const HF_KEY = import.meta.env.VITE_HF_API_KEY;

const AiWidget = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setQuery('');
    setResponse('');
    setError('');
  };

  const fetchGoogleBook = async (q) => {
    try {
      const encoded = encodeURIComponent(q);
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=1`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.items?.[0] || null;
    } catch (err) {
      console.error('Google Books fetch error', err);
      return null;
    }
  };

  // Simple text summarization without AI
  const simpleSummarize = (text, maxSentences = 3) => {
    if (!text) return '';
    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    // Return first few sentences
    return sentences.slice(0, maxSentences).join('. ').trim() + '.';
  };

  const callHuggingFace = async (prompt) => {
    if (!HF_KEY) {
      console.warn('No Hugging Face API key configured');
      return null; // Return null to trigger fallback
    }

    const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
    const body = { inputs: prompt, parameters: { max_new_tokens: 150 } };

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
        const text = await res.text();
        console.error(`HF error: ${res.status} ${text}`);
        return null; // Return null to trigger fallback
      }

      const data = await res.json();
      
      // Handle model loading state
      if (data.error && data.error.includes('loading')) {
        console.warn('Model is loading, using fallback');
        return null;
      }
      
      // result shape varies by model; handle common cases
      if (Array.isArray(data)) {
        const first = data[0];
        return first.generated_text || first[0]?.generated_text || null;
      }
      if (data.generated_text) return data.generated_text;
      if (data.data && Array.isArray(data.data) && data.data[0]?.generated_text) return data.data[0].generated_text;
      
      return null;
    } catch (err) {
      console.error('Hugging Face API error:', err);
      return null;
    }
  };

  const handleAsk = async (type = 'description') => {
    setError('');
    setResponse('');
    if (!query.trim()) {
      setError('Please enter a book title or question');
      return;
    }

    setLoading(true);
    try {
      const bookItem = await fetchGoogleBook(query.trim());
      if (!bookItem) {
        setResponse('No books found for that query. Try a different search term.');
        setLoading(false);
        return;
      }

      const info = bookItem.volumeInfo || {};
      const title = info.title || 'Unknown title';
      const authors = (info.authors || []).join(', ') || 'Unknown author';
      const publisher = info.publisher || 'Unknown publisher';
      const publishedDate = info.publishedDate || 'Unknown date';
      const categories = (info.categories || []).join(', ') || 'General';
      const pageCount = info.pageCount || 'Unknown';
      const googleDesc = info.description;

      // For detailed view, show the full description from Google Books
      if (type === 'description' && googleDesc) {
        setResponse(googleDesc);
        setLoading(false);
        return;
      }

      // For short summary, try AI first, then fallback
      if (type === 'short') {
        if (googleDesc) {
          // Try Hugging Face first
          const prompt = `Summarize this book description in 2-3 sentences: ${googleDesc.slice(0, 500)}`;
          const aiSummary = await callHuggingFace(prompt);
          
          if (aiSummary && aiSummary.trim()) {
            setResponse(aiSummary);
          } else {
            // Fallback: use simple summarization
            const fallbackSummary = simpleSummarize(googleDesc, 3);
            setResponse(fallbackSummary || `"${title}" by ${authors}. ${categories}. ${pageCount} pages.`);
          }
        } else {
          // No description available, create basic info
          setResponse(`"${title}" by ${authors}. Published by ${publisher} on ${publishedDate}. Category: ${categories}. ${pageCount !== 'Unknown' ? pageCount + ' pages.' : ''}`);
        }
        setLoading(false);
        return;
      }

      // Default: if no Google description, try to generate one
      if (!googleDesc) {
        const prompt = `Write a brief book description for: "${title}" by ${authors}, published by ${publisher} in ${publishedDate}. Category: ${categories}.`;
        const generated = await callHuggingFace(prompt);
        
        if (generated && generated.trim()) {
          setResponse(generated);
        } else {
          setResponse(`"${title}" by ${authors}. Published by ${publisher} on ${publishedDate}. Category: ${categories}. ${pageCount !== 'Unknown' ? pageCount + ' pages.' : ''}`);
        }
      } else {
        setResponse(googleDesc);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to fetch book information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-widget-root">
      <button
        className="ai-fab"
        onClick={() => {
          setOpen(!open);
          if (!open) reset();
        }}
        title="Ask AI about a book"
      >
        AI
      </button>

      {open && (
        <div className="ai-modal" role="dialog" aria-modal="true">
          <div className="ai-modal-content">
            <div className="ai-modal-header">
              <h3>Book AI Helper</h3>
              <button className="close" onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="ai-modal-body">
              <p className="hint">Type a book title (or any question about a book). The widget will first check Google Books and use Hugging Face to generate text only when needed.</p>
              <input
                className="ai-input"
                placeholder="e.g. To Kill a Mockingbird"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="ai-buttons">
                <button onClick={() => handleAsk('description')} disabled={loading}>Get description</button>
                <button onClick={() => handleAsk('short')} disabled={loading}>Short summary</button>
                <button onClick={() => handleAsk('description')} disabled={loading}>Detailed</button>
              </div>

              {loading && <div className="ai-loading">Thinking...</div>}

              {error && <div className="ai-error">{error}</div>}

              {response && (
                <div className="ai-response">
                  <h4>Result</h4>
                  <div className="ai-response-text">{response}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiWidget;
