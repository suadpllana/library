import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaArrowLeftLong } from "react-icons/fa6";
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

const CategoryPage = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language];
  const categoryBooks = location.state?.categoryBooks;
  const categoryName = location.state?.categoryName || "Category not found";
  const loading = location.state?.loading;
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredBooks, setFilteredBooks] = useState(categoryBooks || []);
  const [allBooks, setAllBooks] = useState(categoryBooks || []);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startIndex, setStartIndex] = useState(25);

  // When location.state changes (e.g., user selected a new category while
  // already on /category), update local lists so the UI reflects the new selection.
  useEffect(() => {
    if (location.state && location.state.categoryBooks) {
      const newBooks = location.state.categoryBooks || [];
      setAllBooks(newBooks);
      setFilteredBooks(newBooks);
      setStartIndex(25);
    }
  }, [location.state]);


  useEffect(() => {
    if (!allBooks) return;
    
    const filtered = allBooks.filter((book) => {
      const title = book.volumeInfo?.title?.toLowerCase() || "";
      const author = book.volumeInfo?.authors?.[0]?.toLowerCase() || "";
      const query = searchQuery.toLowerCase();
      
      return title.includes(query) || author.includes(query);
    });
    
    setFilteredBooks(filtered);
  }, [searchQuery, allBooks])

  const fetchMoreBooks = async () => {
    setLoadingMore(true);
    const categoryQuery = categoryName.toLowerCase().replace(/\s+/g, '+');
    const query = `subject:${categoryQuery}&maxResults=25&startIndex=${startIndex}`;
    
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}`);
      const data = await response.json();
      const newBooks = data.items || [];
      
      setAllBooks(prev => [...prev, ...newBooks]);
      setStartIndex(prev => prev + 25);
    } catch (error) {
      console.error("Error fetching more books:", error);
    } finally {
      setLoadingMore(false);
    }
  }

 
  function sendBookInfo(book){
    navigate(`/book/${book.id}`, { state: { book } });
  }

  return (
    <>
      {loading ? (
        <p>Loading</p>
      ) : (
        <div className="category-page-wrapper">
        <h3 className="category-go-back"
            onClick={() => navigate(-1)}
        ><FaArrowLeftLong/> {t.goBack}</h3>
          <h2 className="category-page-title">
            {categoryName?.toUpperCase()} {t.books}
          </h2>

          <div className="category-search-wrapper">
            <input
              type="text"
              placeholder={t.searchByTitleOrAuthor}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="category-search-input"
            />
          </div>

          <div className="book-category-container">
            {filteredBooks?.map((book) => (
              <button key={book.id} className="category-book-item" onClick={() => sendBookInfo(book)}>
                <img src={book.volumeInfo?.imageLinks?.thumbnail || book.volumeInfo?.imageLinks?.smallThumbnail || "https://placehold.co/128x192?text=No+Image"} alt="" />
                <h3>{book.volumeInfo?.title.slice(0, 60)}</h3>
                <p className="category-book-author">{t.by} {book?.volumeInfo?.authors?.[0]}</p>
              </button>
            ))}
          </div>

          {filteredBooks?.length === 0 && (
            <div className="category-empty">
              <h3>{t.noBooksFound}</h3>
            </div>
          )}

          {filteredBooks?.length > 0 && !searchQuery && (
            <div className="category-load-more">
              <button
                onClick={fetchMoreBooks}
                disabled={loadingMore}
                className={`category-more-btn ${loadingMore ? 'loading' : ''}`}
              >
                {loadingMore ? t.loading : t.showMore}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default CategoryPage;

