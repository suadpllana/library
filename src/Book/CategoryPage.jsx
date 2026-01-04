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

          <div className="book-category-container">
            {categoryBooks?.map((book) => (
              <div key={book.id} onClick={() => sendBookInfo(book)}>
                <img src={book.volumeInfo?.imageLinks?.thumbnail || book.volumeInfo?.imageLinks?.smallThumbnail || "https://placehold.co/128x192?text=No+Image"} alt="" />
                <h3 style={{color: "#fff"}}>{book.volumeInfo?.title.slice(0, 60)}</h3>
                <p style={{color: "#818cf8"}}>By {book?.volumeInfo?.authors?.[0]}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryPage;
