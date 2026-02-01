import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeftLong, FaPlus, FaMagnifyingGlass, FaPen, FaTrash, FaBook, FaNoteSticky, FaQuoteLeft, FaHashtag, FaBookmark } from "react-icons/fa6";
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './BookNotes.css';

const BookNotes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      toast.error('Please fill in book title and note');
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
        toast.success('Note updated!');
      } else {
        const { error } = await supabase
          .from('book_notes')
          .insert(noteData);

        if (error) throw error;
        toast.success('Note added!');
      }

      resetForm();
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
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
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('book_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      toast.success('Note deleted');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
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

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.book_title.toLowerCase().includes(query) ||
      note.note_text.toLowerCase().includes(query) ||
      note.chapter?.toLowerCase().includes(query) ||
      note.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const title = note.book_title;
    if (!acc[title]) acc[title] = [];
    acc[title].push(note);
    return acc;
  }, {});

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
          <p>Please log in to manage your book notes.</p>
          <Link to="/auth" className="login-btn">Log In</Link>
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
            <FaArrowLeftLong /> Back
          </button>
          <div className="header-info">
            <h1>📝 My Book Notes</h1>
            <p>Capture your thoughts, quotes, and insights</p>
          </div>
          <button className="add-note-btn" onClick={() => setShowAddModal(true)}>
            <FaPlus /> New Note
          </button>
        </div>

        {/* Stats Row */}
        <div className="notes-stats">
          <div className="stat-card">
            <div className="stat-icon notes"><FaNoteSticky /></div>
            <div className="stat-data">
              <span className="stat-num">{notes.length}</span>
              <span className="stat-text">Notes</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon books"><FaBook /></div>
            <div className="stat-data">
              <span className="stat-num">{Object.keys(groupedNotes).length}</span>
              <span className="stat-text">Books</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon tags"><FaHashtag /></div>
            <div className="stat-data">
              <span className="stat-num">
                {[...new Set(notes.flatMap(n => n.tags || []))].length}
              </span>
              <span className="stat-text">Tags</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <FaMagnifyingGlass />
          <input
            type="text"
            placeholder="Search notes, books, or tags..."
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
            <p>Loading your notes...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="empty-state">
            <FaNoteSticky className="empty-icon" />
            <h3>{searchQuery ? 'No notes found' : 'No notes yet'}</h3>
            <p>{searchQuery ? 'Try a different search term' : 'Start capturing your reading insights!'}</p>
            {!searchQuery && (
              <button className="add-first-btn" onClick={() => setShowAddModal(true)}>
                <FaPlus /> Add Your First Note
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
            <h2>{editingNote ? 'Edit Note' : 'Add New Note'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Book Title *</label>
                <input
                  type="text"
                  value={noteForm.book_title}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, book_title: e.target.value }))}
                  placeholder="Enter book title"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Chapter</label>
                  <input
                    type="text"
                    value={noteForm.chapter}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, chapter: e.target.value }))}
                    placeholder="e.g., Chapter 5"
                  />
                </div>
                <div className="form-group">
                  <label>Page Number</label>
                  <input
                    type="number"
                    value={noteForm.page_number}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, page_number: e.target.value }))}
                    placeholder="e.g., 42"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Note *</label>
                <textarea
                  value={noteForm.note_text}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, note_text: e.target.value }))}
                  placeholder="Write your note, quote, or thought..."
                  rows={5}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  value={noteForm.tags}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., quote, insight, important"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingNote ? 'Update Note' : 'Add Note'}
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
