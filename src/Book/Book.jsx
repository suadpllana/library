import React, { useState, useEffect } from "react";
import "./Book.css";
import kidsWithBook from "../assets/image.png";
import booksImage from "../assets/image copy.png";
import LoanModal from "./LoanModal";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

Modal.setAppElement("#root"); // required for accessibility

const Book = ({ setLoanedBooks }) => {
  const [books, setBooks] = useState(() => {
    const booksData = localStorage.getItem("booksData");
    return booksData ? JSON.parse(booksData) : [];
  });

  const [title, setTitle] = useState("");
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [loanModal, setLoanModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  useEffect(() => {
    localStorage.setItem("booksData", JSON.stringify(books));
  }, [books]);

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
          `https://www.googleapis.com/books/v1/volumes?q=${debouncedTitle}`
        );
        const data = await response.json();
        setRecommendedBooks(data.items || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchBooks();
  }, [debouncedTitle]);

  const handleInputChange = (e) => {
    setTitle(e.target.value);
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

  const openDeleteModal = (e, book) => {
    e.stopPropagation();
    setBookToDelete(book);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setBookToDelete(null);
    setDeleteModalOpen(false);
  };

  const confirmDeleteBook = () => {
    setBooks(books.filter((b) => b.id !== bookToDelete.id));
    toast.success(`Book deleted successfully!`);
    closeDeleteModal();
  };

  const openModal = (id) => {
    setModal(true);
    setModalData(books.filter((book) => book.id === id));
  };

  const closeModal = () => setModal(false);

  const openLoanModal = (e, id) => {
    e.stopPropagation();
    setLoanModal((prev) => !prev);
    setModalData(books.filter((book) => book.id === id));
  };

  return (
    <>
      <div className="headerContainer">
        <div className="headerImage">
          <img src={booksImage} alt="" />
        </div>
        <div className="searchContainer">
          <h1>Find your book</h1>
          <input
            className="title-input"
            placeholder="Enter book's name"
            value={title}
            onChange={handleInputChange}
            type="text"
          />
          {recommendedBooks.length > 0 && (
            <div className="recommendations">
              {recommendedBooks.slice(0, 5).map((book) => (
                <div key={book.id} onClick={() => getBookData(book)}>
                  <img
                    src={book?.volumeInfo?.imageLinks?.smallThumbnail}
                    alt=""
                  />
                  <p>{book.volumeInfo?.title}</p>
                </div>
              ))}
            </div>
          )}
          <button
            className="add-book-button"
            onClick={() => getBookData(recommendedBooks[0])}
          >
            Add book
          </button>
          <br />
          <img className="kidsImage" src={kidsWithBook} alt="" />
        </div>
      </div>

      <hr />
      <h1 className="read-later-list">Wishlist</h1>
      {books.length > 0 && (
        <h2 className="book-length">{books.length} books saved</h2>
      )}

      <div className="bookContainer">
        {books.map((book) => (
          <div
            key={book.id}
            className="book"
            onClick={() => openModal(book.id)}
          >
            {book.volumeInfo?.imageLinks?.smallThumbnail && (
              <img
                className="bookImage"
                src={book.volumeInfo.imageLinks.smallThumbnail}
                alt=""
              />
            )}
            <h2>{book.volumeInfo?.title.slice(0, 60)}</h2>
            <button
              className="delete-book-button"
              onClick={(e) => openDeleteModal(e, book)}
            >
              Delete Book
            </button>
            <button
              className="loan-the-book-button"
              onClick={(e) => openLoanModal(e, book.id)}
            >
              Loan the book
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <span onClick={closeModal} className="close">
              x
            </span>
            {modalData.map((book, index) => (
              <React.Fragment key={index}>
                <div className="modal-header">
                  {book.volumeInfo?.imageLinks?.smallThumbnail && (
                    <img
                      className="bookImage"
                      src={book.volumeInfo.imageLinks.smallThumbnail}
                      alt=""
                    />
                  )}
                  <div className="content">
                    <h1>{book.volumeInfo?.title.slice(0, 60)}</h1>
                    <p>{book.volumeInfo?.authors}</p>
                    <p>{book.volumeInfo?.categories}</p>
                    <p>
                      {book.volumeInfo?.publisher}{" "}
                      {book.volumeInfo?.publishedDate}
                    </p>
                    <a href={book.volumeInfo?.previewLink} target="_blank">
                      <button>More</button>
                    </a>
                  </div>
                </div>
                <p className="description">
                  {book.volumeInfo?.description || book.volumeInfo?.title}
                </p>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {loanModal && (
        <LoanModal
          setLoanedBooks={setLoanedBooks}
          modalData={modalData}
          setLoanModal={setLoanModal}
        />
      )}

      <Modal
        isOpen={deleteModalOpen}
        onRequestClose={closeDeleteModal}
        className="customModal"
        overlayClassName="customOverlay"
      >
        <h2>Confirm book deletion</h2>
        <p>
          Are you sure you want to delete{" "}
          <strong>{bookToDelete?.volumeInfo?.title}</strong>?
        </p>
        <div className="modal-buttons">
          <button onClick={confirmDeleteBook} className="confirm-button">
            Yes, Delete
          </button>
          <button onClick={closeDeleteModal} className="cancel-button">
            Cancel
          </button>
        </div>
      </Modal>

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
