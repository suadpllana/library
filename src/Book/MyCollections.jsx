import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './MyCollections.css';

const MyCollections = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    icon: '📚'
  });

  const icons = ['📚', '❤️', '⭐', '🎯', '🔥', '💡', '🌟', '📖', '🎨', '🏆', '🎭', '🌈'];
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#14b8a6'];

  useEffect(() => {
    if (user) {
      fetchCollections();
    }
  }, [user]);

  const fetchCollections = async () => {
    try {
      // Fetch collections with book count
      const { data, error } = await supabase
        .from('reading_collections')
        .select(`
          *,
          collection_books(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCollection) {
        const { error } = await supabase
          .from('reading_collections')
          .update({
            name: formData.name,
            description: formData.description,
            color: formData.color,
            icon: formData.icon
          })
          .eq('id', editingCollection.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reading_collections')
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description,
            color: formData.color,
            icon: formData.icon
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingCollection(null);
      setFormData({ name: '', description: '', color: '#6366f1', icon: '📚' });
      fetchCollections();
    } catch (error) {
      console.error('Error saving collection:', error);
      alert('Failed to save collection');
    }
  };

  const handleEdit = (collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color: collection.color || '#6366f1',
      icon: collection.icon || '📚'
    });
    setShowModal(true);
  };

  const handleDelete = async (collectionId) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      const { error } = await supabase
        .from('reading_collections')
        .delete()
        .eq('id', collectionId);

      if (error) throw error;
      fetchCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Failed to delete collection');
    }
  };

  if (!user) {
    return (
      <div className="collections-page">
        <div className="not-logged-in">
          <h2>📚 My Collections</h2>
          <p>Please log in to view and manage your book collections.</p>
          <Link to="/auth" className="login-btn">Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="collections-page">
      <div className="collections-header">
        <div className="header-content">
          <h1>📚 My Collections</h1>
          <p>Organize your reading journey with custom collections</p>
        </div>
        <button 
          className="create-btn"
          onClick={() => {
            setEditingCollection(null);
            setFormData({ name: '', description: '', color: '#6366f1', icon: '📚' });
            setShowModal(true);
          }}
        >
          <span>+</span> New Collection
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading collections...</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>No Collections Yet</h3>
          <p>Create your first collection to start organizing your books!</p>
          <button 
            className="create-first-btn"
            onClick={() => setShowModal(true)}
          >
            Create Collection
          </button>
        </div>
      ) : (
        <div className="collections-grid">
          {collections.map((collection) => (
            <div 
              key={collection.id} 
              className="collection-card"
              style={{ '--accent-color': collection.color || '#6366f1' }}
            >
              <div className="collection-icon">{collection.icon || '📚'}</div>
              <div className="collection-info">
                <h3>{collection.name}</h3>
                {collection.description && (
                  <p className="description">{collection.description}</p>
                )}
                <span className="book-count">
                  {collection.collection_books?.[0]?.count || 0} books
                </span>
              </div>
              <div className="collection-actions">
                <Link 
                  to={`/collection/${collection.id}`}
                  className="view-btn"
                >
                  View
                </Link>
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(collection)}
                >
                  ✏️
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(collection.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowModal(false)}>×</button>
            <h2>{editingCollection ? 'Edit Collection' : 'Create Collection'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Collection Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Reading List"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What's this collection about?"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Choose Icon</label>
                <div className="icon-picker">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Choose Color</label>
                <div className="color-picker">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${formData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="preview-section">
                <label>Preview</label>
                <div 
                  className="collection-preview"
                  style={{ '--accent-color': formData.color }}
                >
                  <span className="preview-icon">{formData.icon}</span>
                  <span className="preview-name">{formData.name || 'Collection Name'}</span>
                </div>
              </div>

              <button type="submit" className="submit-btn">
                {editingCollection ? 'Save Changes' : 'Create Collection'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCollections;
