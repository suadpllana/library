import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeftLong, FaPlus, FaMagnifyingGlass, FaPen, FaTrash, FaBook, FaNoteSticky } from "react-icons/fa6";
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
          <h2>📝 Book Notes</h2>
          <p>Please log in to manage your book notes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="book-notes-page">
      <h3 className="back-link" onClick={() => navigate(-1)}>
        <FaArrowLeftLong /> Go Back
      </h3>

      <div className="notes-header">
        <div className="header-content">
          <h1><FaNoteSticky /> My Book Notes</h1>
          <p>Keep track of your thoughts, quotes, and highlights</p>
        </div>
        <button className="add-note-btn" onClick={() => setShowAddModal(true)}>
          <FaPlus /> Add Note
        </button>
      </div>

      {/* Search Bar */}
      <div className="notes-search">
        <FaMagnifyingGlass className="search-icon" />
        <input
          type="text"
          placeholder="Search notes by book, content, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="notes-stats">
        <div className="stat">
          <span className="stat-value">{notes.length}</span>
          <span className="stat-label">Total Notes</span>
        </div>
        <div className="stat">
          <span className="stat-value">{Object.keys(groupedNotes).length}</span>
          <span className="stat-label">Books</span>
        </div>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="empty-state">
          <FaNoteSticky className="empty-icon" />
          <h3>{searchQuery ? 'No notes found' : 'No notes yet'}</h3>
          <p>{searchQuery ? 'Try a different search term' : 'Start adding notes to track your reading insights!'}</p>
          {!searchQuery && (
            <button onClick={() => setShowAddModal(true)}>
              <FaPlus /> Add Your First Note
            </button>
          )}
        </div>
      ) : (
        <div className="notes-grouped">
          {Object.entries(groupedNotes).map(([bookTitle, bookNotes]) => (
            <div key={bookTitle} className="book-group">
              <div className="book-group-header">
                <FaBook className="book-icon" />
                <h3>{bookTitle}</h3>
                <span className="note-count">{bookNotes.length} note{bookNotes.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="notes-list">
                {bookNotes.map(note => (
                  <div key={note.id} className="note-card">
                    <div className="note-content">
                      <p className="note-text">{note.note_text}</p>
                      <div className="note-meta">
                        {note.chapter && <span className="meta-item">📖 {note.chapter}</span>}
                        {note.page_number && <span className="meta-item">Page {note.page_number}</span>}
                        <span className="meta-item date">{formatDate(note.updated_at)}</span>
                      </div>
                      {note.tags?.length > 0 && (
                        <div className="note-tags">
                          {note.tags.map((tag, i) => (
                            <span key={i} className="tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="note-actions">
                      <button className="edit-btn" onClick={() => handleEdit(note)}>
                        <FaPen />
                      </button>
                      <button className="delete-btn" onClick={() => handleDelete(note.id)}>
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
