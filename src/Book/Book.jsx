import React, { useState, useRef, useEffect } from "react";
import "./Book.css";
import kidsWithBook from "../assets/image.png";
import booksImage from "../assets/image copy.png";
const Book = () => {
  const [books, setBooks] = useState(() => {
    const booksData = localStorage.getItem("booksData");
    return booksData ? JSON.parse(booksData) : [];
  });

  useEffect(() => {
    localStorage.setItem("booksData", JSON.stringify(books));
  }, [books]);

  const [modal , setModal] = useState(false)
  const [title, setTitle] = useState("");
  const [ modalData , setModalData] = useState([])
 
  async function getBookData() {
    try {
      if (title.trim() === "") return;

      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${title}`
      );
      const data = await response.json();

      if (
        books.some(
          (book) => book.volumeInfo?.title === data.items[0].volumeInfo?.title
        )
      ) {
        return;
      }

      if (data.items && data.items.length > 0) {
        const firstBook = data.items[0];
        setBooks((prevBooks) => [...prevBooks, firstBook]);
      }
      console.log(books);
    } catch (err) {
      console.error(err);
    }
  }

  function deleteBook(e,id) {
    e.stopPropagation()
    console.log(books);
    const filteredBooks = books.filter((book) => book.id !== id);
    setBooks(filteredBooks);
  }
  function enterBook(e) {
    if (e.key === "Enter") {
      getBookData();
    }
  }
  function closeModal(){
    setModal(false)
  }
  function openModal(id){
    setModal(prev => !prev)
    const filteredBook = books.filter(book => book.id === id);
    setModalData(filteredBook)
    console.log(filteredBook)
  }
  return (
    <>
      <div className="headerContainer">
        <div className="headerImage">
          <h2>
          A book is a friend that<br /> never leaves your side. 
          </h2>
          <img src={booksImage} alt="" />
        </div>
        <div className="searchContainer">
          <h1>Find your book</h1>
          <input
            onKeyDown={(e) => enterBook(e)}
            className="title-input"
            placeholder="Enter  book's name"
            onChange={(e) => setTitle(e.target.value)}
            type="text"
          />
          <button className="add-book-button" onClick={getBookData}>
            Add book
          </button>{" "}
          <br />
          <img className="kidsImage" src={kidsWithBook} alt="" />
        </div>
      </div>

      <hr />
      <div className="bookContainer">
        {books.length > 0 ? (
          books.map((book, index) => (
            <div onClick={() => openModal(book.id)} className="book" key={index}>
              {book.volumeInfo && book.volumeInfo.imageLinks ? (
                <img
                  className="bookImage"
                  src={book.volumeInfo.imageLinks.smallThumbnail}
                  alt=""
                />
              ) : (
                <></>
              )}
              {book.volumeInfo && book.volumeInfo.title ? (
                <h2>{book.volumeInfo.title}</h2>
              ) : (
                <></>
              )}

              <button
                className="delete-book-button"
                onClick={(e) => deleteBook(e,book.id)}
              >
                Delete Book
              </button>
            </div>
          ))
        ) : (
          <></>
        )}
      </div>

      {modal &&
        <div className="overlay" onClick={closeModal}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <span onClick={closeModal} className="close"> x</span>
          {modalData.map((book,index) => (
            <>

      <div key={index} className="modal-header">
      {book.volumeInfo && book.volumeInfo.imageLinks ? (
                <img
                  className="bookImage"
                  src={book.volumeInfo.imageLinks.smallThumbnail}
                  alt=""
                />
              ) : (
                <></>
              )}  
            <div className="content">
              <h1>{book.volumeInfo?.title}</h1>   
                <p>{book.volumeInfo?.authors}</p>
                <p>{book.volumeInfo?.categories}</p>
              <p> {book.volumeInfo?.publisher} {book.volumeInfo?.publishedDate}</p>
             <a href={book.volumeInfo?.previewLink} target="_blank"><button>More</button></a> 
            </div>
          </div>

          <p className="description">{book.volumeInfo?.description || book.volumeInfo?.title}</p>
            </>
            
          ))}
          
        </div>
      </div>
      }
    
    </>
  );
};

export default Book;
