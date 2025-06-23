import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AuthorPage.css';
import { FaArrowLeftLong } from "react-icons/fa6";

const AuthorPage = () => {
  const { authorName } = useParams();
  const [authorBooks, setAuthorBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    console.log(authorName);
  }, []);

  useEffect(() => {
    const fetchAuthorBooks = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=inauthor:"${encodeURIComponent(
            decodeURIComponent(authorName)
          )}"&maxResults=40`
        );
        if (!response.ok) throw new Error("Failed to fetch author's books");
        const data = await response.json();
        setAuthorBooks(data.items || []);
        console.log(data);
      } catch (err) {
        console.error(err);
        toast.error(`Failed to fetch books by ${decodeURIComponent(authorName)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorBooks();
  }, [authorName]);

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return authorBooks;
    return authorBooks.filter((book) =>
      book?.volumeInfo?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [authorBooks, searchTerm]);

  const handleBookClick = (book) => {
    navigate(`/library/book/${book.id}`, { state: { book } });
  };

  return (
    <div className="author-detail">
          <h3 style={{textAlign: "left", marginTop: "3rem",  cursor: "pointer", color: "white"}}
            onClick={() => navigate(-1)}
        ><FaArrowLeftLong/> Go Back</h3>
      <h2 style={{marginTop: "2rem", textAlign: "center"}}>Books by {decodeURIComponent(authorName)}</h2>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search books by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          aria-label="Search books by title"
        />
      </div>
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : filteredBooks.length === 0 ? (
        <p style={{color: "white"}}>
          {authorBooks.length === 0
            ? 'No books found for this author.'
            : 'No books match your search.'}
        </p>
      ) : (
        <div className="author-books-grid">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="author-book-item"
              onClick={() => handleBookClick(book)}
            >
              <img
                src={
                  book?.volumeInfo?.imageLinks?.thumbnail ||
                  book?.volumeInfo?.imageLinks?.smallThumbnail ||
                  'https://placehold.co/128x192?text=No+Image'
                }
                alt={book?.volumeInfo?.title || 'No Title'}
              />
              <p>{book?.volumeInfo?.title.slice(0, 100) || 'Unknown Title'}</p>
              <p className="author">
                by {book?.volumeInfo?.authors?.join(', ') || 'Unknown Author'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthorPage;