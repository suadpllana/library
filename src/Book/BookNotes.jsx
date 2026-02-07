import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeftLong, FaPlus, FaMagnifyingGlass, FaPen, FaTrash, FaBook, FaNoteSticky, FaQuoteLeft, FaHashtag, FaBookmark } from "react-icons/fa6";
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import './BookNotes.css';

const BookNotes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({
    book_title: '',
    note_text: '',
    page_number: '',
    chapter: '',
    tags: ''
  });

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('book_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      // Table might not exist yet
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!noteForm.book_title.trim() || !noteForm.note_text.trim()) {
      toast.error(t.pleaseFillTitleNote);
      return;
    }

    try {
      const noteData = {
        user_id: user.id,
        book_title: noteForm.book_title.trim(),
        note_text: noteForm.note_text.trim(),
        page_number: noteForm.page_number ? parseInt(noteForm.page_number) : null,
        chapter: noteForm.chapter.trim() || null,
        tags: noteForm.tags ? noteForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      if (editingNote) {
        const { error } = await supabase
          .from('book_notes')
          .update({
            ...noteData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingNote.id);

        if (error) throw error;
        toast.success(t.noteUpdated);
      } else {
        const { error } = await supabase
          .from('book_notes')
          .insert(noteData);

        if (error) throw error;
        toast.success(t.noteAdded);
      }

      resetForm();
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error(t.failedSaveNote);
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setNoteForm({
      book_title: note.book_title,
      note_text: note.note_text,
      page_number: note.page_number?.toString() || '',
      chapter: note.chapter || '',
      tags: note.tags?.join(', ') || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (noteId) => {
    if (!confirm(t.confirmDeleteNote)) return;

    try {
      const { error } = await supabase
        .from('book_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      toast.success(t.noteDeleted);
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error(t.failedDeleteNote);
    }
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingNote(null);
    setNoteForm({
      book_title: '',
      note_text: '',
      page_number: '',
      chapter: '',
      tags: ''
    });
  };

  const filteredNotes = useMemo(() => notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.book_title.toLowerCase().includes(query) ||
      note.note_text.toLowerCase().includes(query) ||
      note.chapter?.toLowerCase().includes(query) ||
      note.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }), [notes, searchQuery]);

  const groupedNotes = useMemo(() => filteredNotes.reduce((acc, note) => {
    const title = note.book_title;
    if (!acc[title]) acc[title] = [];
    acc[title].push(note);
    return acc;
  }, {}), [filteredNotes]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="book-notes-page">
        <div className="not-logged-in">
          <FaNoteSticky className="not-logged-icon" />
          <h2>Book Notes</h2>
          <p>{t.pleaseLogIn}</p>
          <Link to="/auth" className="login-btn">{t.logIn}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="book-notes-page">
      <div className="notes-container">
        {/* Header */}
        <div className="notes-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeftLong /> {t.back}
          </button>
          <div className="header-info">
            <h1>{`📝 ${t.myBookNotes}`}</h1>
            <p>{t.captureThoughts}</p>
          </div>
          <button className="add-note-btn" onClick={() => setShowAddModal(true)}>
            <FaPlus /> {t.newNote}
          </button>
        </div>

        {/* Stats Row */}
        <div className="notes-stats">
          <div className="stat-card">
            <div className="stat-icon notes"><FaNoteSticky /></div>
            <div className="stat-data">
              <span className="stat-num">{notes.length}</span>
              <span className="stat-text">{t.notes}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon books"><FaBook /></div>
            <div className="stat-data">
              <span className="stat-num">{Object.keys(groupedNotes).length}</span>
              <span className="stat-text">{t.booksLabel}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon tags"><FaHashtag /></div>
            <div className="stat-data">
              <span className="stat-num">
                {[...new Set(notes.flatMap(n => n.tags || []))].length}
              </span>
              <span className="stat-text">{t.tagsLabel}</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <FaMagnifyingGlass />
          <input
            type="text"
            placeholder={t.searchNotesPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>{t.loadingNotes}</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="empty-state">
            <FaNoteSticky className="empty-icon" />
            <h3>{searchQuery ? t.noNotesFound : t.noNotesYet}</h3>
            <p>{searchQuery ? t.tryDifferentSearch : t.startCapturingInsights}</p>
            {!searchQuery && (
              <button className="add-first-btn" onClick={() => setShowAddModal(true)}>
                <FaPlus /> {t.addFirstNote}
              </button>
            )}
          </div>
        ) : (
          <div className="notes-grid">
            {Object.entries(groupedNotes).map(([bookTitle, bookNotes]) => (
              <div key={bookTitle} className="book-section">
                <div className="book-section-header">
                  <FaBook className="book-icon" />
                  <h3>{bookTitle}</h3>
                  <span className="note-badge">{bookNotes.length}</span>
                </div>
                
                <div className="notes-cards">
                  {bookNotes.map(note => (
                    <div key={note.id} className="note-card">
                      <div className="note-body">
                        {note.note_text.startsWith('"') && (
                          <FaQuoteLeft className="quote-icon" />
                        )}
                        <p className="note-text">{note.note_text}</p>
                        
                        <div className="note-footer">
                          <div className="note-meta">
                            {note.chapter && (
                              <span className="meta-chip">
                                <FaBookmark /> {note.chapter}
                              </span>
                            )}
                            {note.page_number && (
                              <span className="meta-chip">p.{note.page_number}</span>
                            )}
                          </div>
                          
                          {note.tags?.length > 0 && (
                            <div className="note-tags">
                              {note.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="tag">#{tag}</span>
                              ))}
                              {note.tags.length > 3 && (
                                <span className="tag more">+{note.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <span className="note-date">{formatDate(note.updated_at)}</span>
                      </div>
                      
                      <div className="note-actions">
                        <button className="edit-btn" onClick={() => handleEdit(note)} title="Edit">
                          <FaPen />
                        </button>
                        <button className="delete-btn" onClick={() => handleDelete(note.id)} title="Delete">
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingNote ? t.editNoteTitle : t.addNewNote}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t.bookTitleStar}</label>
                <input
                  type="text"
                  value={noteForm.book_title}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, book_title: e.target.value }))}
                  placeholder={t.enterBookTitle}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t.chapterLabel}</label>
                  <input
                    type="text"
                    value={noteForm.chapter}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, chapter: e.target.value }))}
                    placeholder={t.chapterPlaceholder}
                  />
                </div>
                <div className="form-group">
                  <label>{t.pageNumber}</label>
                  <input
                    type="number"
                    value={noteForm.page_number}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, page_number: e.target.value }))}
                    placeholder={t.pagePlaceholder}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t.noteStar}</label>
                <textarea
                  value={noteForm.note_text}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, note_text: e.target.value }))}
                  placeholder={t.writeYourNote}
                  rows={5}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t.tagsCommaSeparated}</label>
                <input
                  type="text"
                  value={noteForm.tags}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder={t.tagsPlaceholder}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  {t.cancel}
                </button>
                <button type="submit" className="submit-btn">
                  {editingNote ? t.updateNote : t.addNote}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookNotes;
