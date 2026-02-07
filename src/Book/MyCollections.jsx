import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import './MyCollections.css';

const MyCollections = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
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
      toast.error(t.failedSaveCollection);
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
    if (!confirm(t.confirmDeleteCollection)) return;

    try {
      const { error } = await supabase
        .from('reading_collections')
        .delete()
        .eq('id', collectionId);

      if (error) throw error;
      toast.success(t.collectionDeletedSuccess);
      fetchCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error(t.failedDeleteCollection);
    }
  };

  if (!user) {
    return (
      <div className="collections-page">
        <div className="not-logged-in">
          <h2>{`📚 ${t.myCollections}`}</h2>
          <p>{t.pleaseLogIn}</p>
          <Link to="/auth" className="login-btn">{t.logIn}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="collections-page">
      <div className="collections-header">
        <div className="header-content">
          <h1>{`📚 ${t.myCollections}`}</h1>
          <p>{t.organizeReadingJourney}</p>
        </div>
        <button 
          className="create-btn"
          onClick={() => {
            setEditingCollection(null);
            setFormData({ name: '', description: '', color: '#6366f1', icon: '📚' });
            setShowModal(true);
          }}
        >
          <span>+</span> {t.newCollection}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t.loadingCollections}</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>{t.noCollectionsYetTitle}</h3>
          <p>{t.createFirstDesc}</p>
          <button 
            className="create-first-btn"
            onClick={() => setShowModal(true)}
          >
            {t.createCollection}
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
                  {collection.collection_books?.[0]?.count || 0} {t.books}
                </span>
              </div>
              <div className="collection-actions">
                <Link 
                  to={`/collection/${collection.id}`}
                  className="view-btn"
                >
                  {t.view}
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowModal(false)}>×</button>
            <h2>{editingCollection ? t.editCollection : t.createCollection}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t.collectionNameLabel}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.summerReadingList}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t.descriptionOptional}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t.whatsCollectionAbout}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>{t.chooseIcon}</label>
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
                <label>{t.chooseColor}</label>
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
                <label>{t.preview}</label>
                <div 
                  className="collection-preview"
                  style={{ '--accent-color': formData.color }}
                >
                  <span className="preview-icon">{formData.icon}</span>
                  <span className="preview-name">{formData.name || t.collectionNameLabel}</span>
                </div>
              </div>

              <button type="submit" className="submit-btn">
                {editingCollection ? t.saveChanges : t.createCollection}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCollections;
