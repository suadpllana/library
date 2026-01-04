import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaArrowLeftLong } from "react-icons/fa6";

const CategoryPage = () => {
  const location = useLocation();
  const categoryBooks = location.state?.categoryBooks;
  const categoryName = location.state?.categoryName || "Category not found";
  const loading = location.state?.loading;
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredBooks, setFilteredBooks] = useState(categoryBooks || []);
  const [allBooks, setAllBooks] = useState(categoryBooks || []);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startIndex, setStartIndex] = useState(25);


  useEffect(() => {
    console.log(categoryBooks)
  } ,[ ])

 
  function sendBookInfo(book){
    navigate(`/book/${book.id}`, { state: { book } });
  }

  return (
    <div style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)', minHeight: '100vh', paddingTop: '70px' }}>
      {loading ? (
        <p style={{ color: '#818cf8', textAlign: 'center', padding: '3rem' }}>Loading...</p>
      ) : (
        <>
        <h3 style={{
          textAlign: "left", 
          marginTop: "1.5rem", 
          marginLeft: "20px", 
          cursor: "pointer",
          color: "#818cf8",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          transition: "all 0.2s ease"
        }}
            onClick={() => navigate(-1)}
        ><FaArrowLeftLong/> Go Back</h3>
          <h2 style={{ 
            marginTop: "1.5rem", 
            textAlign: "center",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "1.75rem",
            fontWeight: "700",
            background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            {categoryName?.toUpperCase()} BOOKS
          </h2>

          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                width: "90%",
                maxWidth: "500px",
                borderRadius: "25px",
                border: "2px solid #ccc",
                outline: "none",
                transition: "border-color 0.3s"
              }}
              onFocus={(e) => e.target.style.borderColor = "#007bff"}
              onBlur={(e) => e.target.style.borderColor = "#ccc"}
            />
          </div>

          <div className="book-category-container">
            {filteredBooks?.map((book) => (
              <div key={book.id} onClick={() => sendBookInfo(book)}>
                <img src={book.volumeInfo?.imageLinks?.thumbnail || book.volumeInfo?.imageLinks?.smallThumbnail || "https://placehold.co/128x192?text=No+Image"} alt="" />
                <h3 style={{color: "#fff"}}>{book.volumeInfo?.title.slice(0, 60)}</h3>
                <p style={{color: "#818cf8"}}>By {book?.volumeInfo?.authors?.[0]}</p>
              </div>
            ))}
          </div>

          {filteredBooks?.length === 0 && (
            <div style={{ textAlign: "center", marginTop: "3rem", color: "#a0a0a0" }}>
              <h3>No books found</h3>
            </div>
          )}

          {filteredBooks?.length > 0 && !searchQuery && (
            <div style={{ textAlign: "center", margin: "3rem 0" }}>
              <button
                onClick={fetchMoreBooks}
                disabled={loadingMore}
                style={{
                  padding: "12px 30px",
                  fontSize: "16px",
                  backgroundColor: loadingMore ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  width: "150px",
                  borderRadius: "25px",
                  cursor: loadingMore ? "not-allowed" : "pointer",
                  transition: "background-color 0.3s"
                }}
                onMouseEnter={(e) => !loadingMore && (e.target.style.backgroundColor = "#0056b3")}
                onMouseLeave={(e) => !loadingMore && (e.target.style.backgroundColor = "#007bff")}
              >
                {loadingMore ? "Loading..." : "Show More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryPage;
