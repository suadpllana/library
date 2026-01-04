import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './AddToCollectionModal.css';

const AddToCollectionModal = ({ book, isOpen, onClose }) => {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCollection, setNewCollection] = useState({ name: '', description: '' });

  useEffect(() => {
    if (isOpen && user) {
      fetchCollections();
    }
  }, [isOpen, user]);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('reading_collections')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollection.name.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reading_collections')
        .insert({
          user_id: user.id,
          name: newCollection.name,
          description: newCollection.description
        })
        .select()
        .single();

      if (error) throw error;

      setCollections([...collections, data]);
      setSelectedCollection(data.id);
      setNewCollection({ name: '', description: '' });
      setShowNewForm(false);
      toast.success('Collection created!');
    } catch (error) {
      console.error('Error creating collection:', error);
      toast.error('Failed to create collection');
    }
  };

  const handleAddToCollection = async () => {
    if (!selectedCollection) {
      toast.error('Please select a collection');
      return;
    }

    setSaving(true);
    try {
      // Check if book already exists in collection
      const { data: existing } = await supabase
        .from('collection_books')
        .select('id')
        .eq('collection_id', selectedCollection)
        .eq('book_id', book.id)
        .single();

      if (existing) {
        toast.info('This book is already in the collection');
        onClose();
        return;
      }

      const { error } = await supabase
        .from('collection_books')
        .insert({
          collection_id: selectedCollection,
          book_id: book.id,
          book_title: book.volumeInfo?.title || 'Unknown Title',
          notes: notes
        });

      if (error) throw error;

      toast.success('Book added to collection!');
      onClose();
    } catch (error) {
      console.error('Error adding to collection:', error);
      toast.error('Failed to add book to collection');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="collection-modal-overlay" onClick={onClose}>
      <div className="collection-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>📚 Add to Collection</h2>
          <p>Save "{book?.volumeInfo?.title}" to a collection</p>
        </div>

        {loading ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Loading collections...</p>
          </div>
        ) : (
          <>
            {collections.length === 0 && !showNewForm ? (
              <div className="no-collections">
                <p>You don't have any collections yet.</p>
                <button 
                  className="create-new-btn"
                  onClick={() => setShowNewForm(true)}
                >
                  + Create Your First Collection
                </button>
              </div>
            ) : (
              <>
                {!showNewForm && (
                  <div className="collections-list">
                    <label>Select a collection:</label>
                    <div className="collection-options">
                      {collections.map((col) => (
                        <button
                          key={col.id}
                          className={`collection-option ${selectedCollection === col.id ? 'selected' : ''}`}
                          onClick={() => setSelectedCollection(col.id)}
                        >
                          <span className="option-icon">{col.icon || '📚'}</span>
                          <span className="option-name">{col.name}</span>
                        </button>
                      ))}
                    </div>
                    
                    <button 
                      className="create-new-link"
                      onClick={() => setShowNewForm(true)}
                    >
                      + Create new collection
                    </button>
                  </div>
                )}

                {showNewForm && (
                  <div className="new-collection-form">
                    <h4>Create New Collection</h4>
                    <input
                      type="text"
                      placeholder="Collection name"
                      value={newCollection.name}
                      onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newCollection.description}
                      onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                      rows="2"
                    />
                    <div className="form-actions">
                      <button 
                        className="cancel-btn"
                        onClick={() => setShowNewForm(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="create-btn"
                        onClick={handleCreateCollection}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {!showNewForm && (
                  <>
                    <div className="notes-section">
                      <label>Notes (optional):</label>
                      <textarea
                        placeholder="Add personal notes about this book..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows="3"
                      />
                    </div>

                    <button 
                      className="add-btn"
                      onClick={handleAddToCollection}
                      disabled={!selectedCollection || saving}
                    >
                      {saving ? 'Adding...' : 'Add to Collection'}
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AddToCollectionModal;
