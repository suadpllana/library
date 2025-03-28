import React, { useState, useEffect } from "react";
import "./Book.css";
import kidsWithBook from "../assets/image.png";
import booksImage from "../assets/image copy.png";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const Book = () => {
  const [books, setBooks] = useState(() => {
    const booksData = localStorage.getItem("booksData");
    return booksData ? JSON.parse(booksData) : [];
  });

  const [title, setTitle] = useState("");
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalData, setModalData] = useState([]);

  useEffect(() => {
    localStorage.setItem("booksData", JSON.stringify(books));
  }, [books]);

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setTitle(value);

    if (value.trim() === "") {
      setRecommendedBooks([]);
      return;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${value}`
      );
      const data = await response.json();
      setRecommendedBooks(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const getBookData = (selectedBook) => {
    if (recommendedBooks.length > 0) {
      const firstBook = selectedBook || recommendedBooks[0];

      if (!books.some((book) => book.id === firstBook.id)) {
        setBooks((prevBooks) => [...prevBooks, firstBook]);
        toast.success("Book added successfully!");

      }

      setTitle(""); 
      setRecommendedBooks([]); 
    }
  };

  const deleteBook = (e, id) => {
    e.stopPropagation();
    setBooks(books.filter((book) => book.id !== id));
    toast.success("Book deleted successfully!");
  };

  const openModal = (id) => {
    setModal(true);
    setModalData(books.filter((book) => book.id === id));
  };

  const closeModal = () => setModal(false);

  return (
    <>
      <div className="headerContainer">
        <div className="headerImage">
          <h2>A book is a friend that<br /> never leaves your side.</h2>
          <img src={booksImage} alt="" />
        </div>
        <div className="searchContainer">
          <h1>Find your book</h1>
          <input
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              getBookData(recommendedBooks[0]);
            }
          }
        }
            className="title-input"
            placeholder="Enter book's name"
            value={title}
            onChange={handleInputChange}
            type="text"
          />  {recommendedBooks.length > 0 && (
            <div className="recommendations">
              {recommendedBooks.slice(0, 5).map((book) => (
                <div key={book.id} onClick={() => getBookData(book)}>
                  <img src={book?.volumeInfo
                    ?.imageLinks?.smallThumbnail} alt="" />
                  <p >{book.volumeInfo?.title}</p>
                </div>
              ))}
            </div>
          )}
          <button className="add-book-button" onClick={() => getBookData(recommendedBooks[0])}>
            Add book
          </button>
          <br />
          <img className="kidsImage" src={kidsWithBook} alt="" />

        
        
        </div>
      </div>

      <hr />
      {books.length > 0 && <h2 className="book-length">{books.length} books saved</h2>}

      <div className="bookContainer">
        {books.map((book) => (
          <div key={book.id} className="book" onClick={() => openModal(book.id)}>
            {book.volumeInfo?.imageLinks?.smallThumbnail && (
              <img className="bookImage" src={book.volumeInfo.imageLinks.smallThumbnail} alt="" />
            )}
            <h2>{book.volumeInfo?.title.slice(0,60)}</h2>
            <button className="delete-book-button" onClick={(e) => deleteBook(e, book.id)}>
              Delete Book
            </button>
          </div>
        ))}
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
              <h1>{book.volumeInfo?.title.slice(0,60)}</h1>   
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
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"

        />


    </>
  );
};

export default Book;
