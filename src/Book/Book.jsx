import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Book.css";
import booksImage from "../assets/image copy.png";
import kidsWithBook from "../assets/image.png";
import { toast } from "react-toastify";
import { FaChevronLeft } from "react-icons/fa";
import { FaChevronRight } from "react-icons/fa";
import AiWidget from '../components/AiWidget';
import "react-toastify/dist/ReactToastify.css";

const Book = () => {
  const [title, setTitle] = useState("");
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [categories, setCategories] = useState({
    mostReadBooks: [],
    newReleases: [],
    criticallyAcclaimed: [],
    hiddenGems: [],
    trendingNow: [],
    bookClubFavorites: [],
    bestOfTheYear: [],
    readersChoice: [],

  });
  const [currentSlides, setCurrentSlides] = useState({
    mostReadBooks: 0,
    newReleases: 0,
    criticallyAcclaimed: 0,
    hiddenGems: 0,
    trendingNow: 0,
    bookClubFavorites: 0,
    bestOfTheYear: 0,
    readersChoice: 0,

  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTitle(title);
    }, 500);

    return () => clearTimeout(timer);
  }, [title]);

  useEffect(() => {
    const fetchBooks = async () => {
      if (debouncedTitle.trim() === "") {
        setRecommendedBooks([]);
        return;
      }

      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${debouncedTitle}&maxResults=10`
        );
        if (!response.ok) throw new Error("Failed to fetch books");
        const data = await response.json();
        setRecommendedBooks(data.items || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch books");
      }
    };

    fetchBooks();
  }, [debouncedTitle]);

  useEffect(() => {
    const fetchCategoryBooks = async () => {
      setLoading(true);
      const categoryQueries = {
        mostReadBooks: "bestseller&maxResults=8",
        newReleases: "subject:fiction&orderBy=newest&maxResults=8",
        hiddenGems: "subject:literary+fiction&maxResults=8",
        bookClubFavorites: "subject:book+club&maxResults=8",

      };

      try {
        const results = {};
        for (const [category, query] of Object.entries(categoryQueries)) {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${query}`
          );
          if (!response.ok) throw new Error(`Failed to fetch ${category}`);
          const data = await response.json();
          results[category] = data.items || [];
        }
        setCategories(results);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch category books");
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryBooks();
  }, []);

  function getAuthorFromBook(e, author){
    e.stopPropagation()
    navigate(`/authors/${author}`)
  }

 const handleSlide = (category, direction) => {
  setCurrentSlides((prev) => {
    const totalBooks = categories[category].length;
    const booksPerSlide = 4;
    const maxIndex = Math.max(0, totalBooks - booksPerSlide);
    let newIndex = prev[category] + direction * booksPerSlide;
    
    if (newIndex < 0) {
      newIndex = Math.floor(maxIndex / booksPerSlide) * booksPerSlide;
    } else if (newIndex > maxIndex) {
      newIndex = 0;
    } else {
      newIndex = Math.round(newIndex / booksPerSlide) * booksPerSlide;
    }
    
    return { ...prev, [category]: newIndex };
  });
};

  const handleInputChange = (e) => {
    setTitle(e.target.value);
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`, { state: { book , id: book.id } });
  };

  const renderSlideshow = (category, books) => {
    if (!books || books.length === 0) {
      return <p>No books available in {category.replace(/([A-Z])/g, " $1").trim()}</p>;
    }

    const currentIndex = currentSlides[category];
    const booksPerSlide = 4;
    const visibleBooks = books.slice(currentIndex, currentIndex + booksPerSlide);

    return (
      <div className="slideshow">
        <h2>{category.replace(/([A-Z])/g, " $1").trim()}</h2>
        <div className="slideshow-container">
        
            < FaChevronLeft  className="slide-button prev"
            onClick={() => handleSlide(category, -1)}
            disabled={books.length <= booksPerSlide}/>
      
          <div className="slide-items">
            {visibleBooks?.map((book) => (
              <div
                key={book.id}
                className="slide-item"
                onClick={() => handleBookClick(book)}
              >
                <img
                  src={book?.volumeInfo?.imageLinks?.smallThumbnail || "https://placehold.co/128x192?text=No+Image"}
                  alt={book?.volumeInfo?.title || "No Title"}
                />
                <p>{book?.volumeInfo?.title?.slice(0,100) || "Unknown Title"}</p>
                <p className="author" onClick={(e) => getAuthorFromBook(e,book?.volumeInfo?.authors[0])}>by {book?.volumeInfo?.authors?.join(", ") || "Unknown Author"}</p>
              </div>
            ))}
            {visibleBooks?.length < booksPerSlide &&
              Array?.from({ length: booksPerSlide - visibleBooks.length })?.map((_, index) => (
                <div key={`placeholder-${index}`} className="slide-item placeholder">
                  <div className="placeholder-image"></div>
                  <p>No Book Available</p>
                </div>
              ))}
          </div>
        
           <FaChevronRight 
             className="slide-button next"
            onClick={() => handleSlide(category, 1)}
            disabled={books.length <= booksPerSlide}
           />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="headerContainer">
        <div className="headerImage">
          <img src={booksImage} alt="Books" />
        </div>
        <div className="searchContainer">
          <h1>Search the book</h1>
          <input
            className="title-input"
            placeholder="Enter a book's name"
            value={title}
            onChange={handleInputChange}
            type="text"
          />
          {recommendedBooks?.length > 0 && (
            <div className="recommendations">
              {recommendedBooks?.slice(0, 5)?.map((book) => (
                <div
                  key={book?.id}
                  onClick={() => handleBookClick(book)}
                  className="recommendation-item"
                >
                  <img
                    src={
                      book?.volumeInfo?.imageLinks?.smallThumbnail ||
                      book?.volumeInfo?.imageLinks?.thumbnail ||
                      "https://placehold.co/128x192?text=No+Image"
                    }
                    alt={book?.volumeInfo?.title || "No Title"}
                  />
                  <p>{book?.volumeInfo?.title?.slice(0,50) || "Unknown Title"}{book?.volumeInfo?.authors?.[0] && ` - ${book.volumeInfo.authors[0]}`}</p>
                </div>
              ))}
            </div>
          )}
          <img className="kidsImage" src={kidsWithBook} alt="Kids with book" />
        </div>
      </div>
      <hr />
      <div className="categories-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : (
          Object.entries(categories)?.map(([category, books]) => (
            <div key={category} className="category-section">
              {renderSlideshow(category, books)}
            </div>
          ))
        )}
        {!loading &&  <footer style={{textAlign: "center"}}>Created by @Suad Pllana </footer>}
       
      </div>
            <AiWidget />

    </>
  );
};

export default Book;