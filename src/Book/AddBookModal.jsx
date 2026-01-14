import React, { useState } from 'react';
import './AddBookModal.css';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

const AddBookModal = ({ setOpenModal, onBookAdded }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !author.trim()) {
      toast.error('Please fill in both title and author');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('Please sign in to add books');
        return;
      }

      // Create a unique ID for manually added books
      const manualBookId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { error: insertError } = await supabase
        .from('wishlist')
        .insert([{
          book_id: manualBookId,
          title: title.trim(),
          authors: [author.trim()],
          image_url: 'https://placehold.co/128x192/4a5568/ffffff?text=Manual+Book',
          user_id: user.id
        }]);
      
      if (insertError) {
        console.error('Insert error:', insertError);
        toast.error(`Failed to add book: ${insertError.message}`);
        return;
      }
      
      toast.success(`"${title}" added to wishlist!`);
      setTitle('');
      setAuthor('');
      setOpenModal(false);
      
      // Notify parent to refresh the list
      if (onBookAdded) {
        onBookAdded();
      }
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error(`Failed to add book: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-book-modal-overlay" onClick={() => setOpenModal(false)}>
      <div className="add-book-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="add-book-modal-header">
          <h2>📚 Add Book Manually</h2>
          <button 
            className="close-btn" 
            onClick={() => setOpenModal(false)}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="add-book-form">
          <div className="form-group">
            <label htmlFor="book-title">Book Title *</label>
            <input
              id="book-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The Great Gatsby"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="book-author">Author *</label>
            <input
              id="book-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g., F. Scott Fitzgerald"
              maxLength={100}
              required
            />
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={() => setOpenModal(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="add-btn"
              disabled={loading}
            >
              {loading ? 'Adding...' : '+ Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookModal;
