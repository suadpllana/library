import React, { useState } from 'react';
import './AiWidget.css';

const HF_MODEL = import.meta.env.VITE_HF_MODEL || 'google/flan-t5-small';
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

  const callHuggingFace = async (prompt) => {
    if (!HF_KEY) {
      throw new Error('Missing Hugging Face API key. Set VITE_HF_API_KEY in your env.');
    }

    const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
    const body = { inputs: prompt };

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
      throw new Error(`HF error: ${res.status} ${text}`);
    }

    const data = await res.json();
    // result shape varies by model; handle common cases
    if (Array.isArray(data)) {
      const first = data[0];
      return first.generated_text || first[0]?.generated_text || JSON.stringify(first);
    }
    if (data.generated_text) return data.generated_text;
    if (data.data && Array.isArray(data.data) && data.data[0]?.generated_text) return data.data[0].generated_text;
    return JSON.stringify(data);
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
        setResponse('No books found for that query.');
        setLoading(false);
        return;
      }

      const info = bookItem.volumeInfo || {};
      const title = info.title || 'Unknown title';
      const authors = (info.authors || []).join(', ') || 'Unknown author';
      const publisher = info.publisher || 'Unknown publisher';
      const publishedDate = info.publishedDate || 'Unknown date';
      const googleDesc = info.description;

      if (googleDesc) {
        if (type === 'short') {
          const prompt = `Summarize the following book description in 2-3 short sentences:\n\nTitle: ${title}\nAuthors: ${authors}\nDescription: ${googleDesc}`;
          const gen = await callHuggingFace(prompt);
          setResponse(gen);
        } else {
          setResponse(googleDesc);
        }
        setLoading(false);
        return;
      }

      const prompt = `Write a friendly, engaging ${type === 'short' ? 'short ' : ''}description for the book using the information below. Keep it natural and helpful.\n\nTitle: ${title}\nAuthors: ${authors}\nPublisher: ${publisher}\nPublished Date: ${publishedDate}\n\nUse the details to create a concise description.`;

      const generated = await callHuggingFace(prompt);
      setResponse(generated);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong');
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
