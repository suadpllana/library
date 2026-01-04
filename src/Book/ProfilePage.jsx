import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeftLong } from "react-icons/fa6";
import { supabase } from '../lib/supabase';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [wishlistBooks, setWishlistBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
    fetchWishlistBooks();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('Please sign in to view your profile');
        navigate('/');
        return;
      }

      setUserProfile({
        email: user.email,
        created_at: new Date(user.created_at).toLocaleDateString(),
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const fetchWishlistBooks = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) return;

      const { data: wishlistItems, error } = await supabase
        .from('wishlist')
        .select('title, authors, created_at, book_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWishlistBooks(wishlistItems);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (bookId, bookTitle) => {
    navigate(`/book/${bookId}`, { 
      state: { 
        book: { 
          id: bookId,
          volumeInfo: { title: bookTitle } 
        } 
      } 
    });
  };

  if (loading) {
    return <div className="profile-page">Loading...</div>;
  }

  return (
    <div className="profile-page">
      <h3 
        className="back-link"
        onClick={() => navigate(-1)}
      >
        <FaArrowLeftLong /> Go Back
      </h3>

      <div className="profile-container">
        <h1>Profile</h1>
        
        {userProfile && (
          <div className="profile-info">
            <h2>Personal Information</h2>
            <div className="info-item">
              <label>Name:</label>
              <span>{userProfile.first_name || 'Not set'}</span>
            </div>
            <div className="info-item">
              <label>Surname:</label>
              <span>{userProfile.last_name || 'Not set'}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{userProfile.email}</span>
            </div>
            <div className="info-item">
              <label>Member Since:</label>
              <span>{userProfile.created_at}</span>
            </div>
          </div>
        )}

        <div className="wishlist-section">
          <h2>My Saved Books ({wishlistBooks.length})</h2>
          {wishlistBooks.length === 0 ? (
            <p>No books in your wishlist yet.</p>
          ) : (
            <ul className="saved-books-list">
              {wishlistBooks.map((book, index) => (
                <li 
                  key={index}
                  onClick={() => handleBookClick(book.book_id, book.title)}
                >
                  <span className="book-title">{book.title}</span>
                  <span className="book-authors">by {book.authors?.join(', ')}</span>
                  <span className="save-date">
                    Saved on {new Date(book.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;