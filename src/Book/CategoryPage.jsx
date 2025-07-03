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

  useEffect(() => {
    console.log(categoryBooks)
  } ,[ ])

 
  function sendBookInfo(book){
    navigate(`/book/${book.id}`, { state: { book } });
  }

  return (
    <>
      {loading ? (
        <p>Loading</p>
      ) : (
        <>
        <h3 style={{textAlign: "left", marginTop: "5rem", marginLeft: "20px", cursor: "pointer"}}
            onClick={() => navigate(-1)}
        ><FaArrowLeftLong/> Go Back</h3>
          <h2 style={{ marginTop: "1rem", textAlign: "center" }}>
            {categoryName?.toUpperCase()} BOOKS
          </h2>

          <div className="book-category-container">
            {categoryBooks?.map((book) => (
              <div key={book.id} onClick={() => sendBookInfo(book)}>
                <img src={book.volumeInfo?.imageLinks?.thumbnail || book.volumeInfo?.imageLinks?.smallThumbnail || "https://placehold.co/128x192?text=No+Image"} alt="" />
                <h3>{book.volumeInfo?.title.slice(0, 60)}</h3>
                <p style={{color: "#a0a0a0"}}>By {book?.volumeInfo.authors[0]}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default CategoryPage;
