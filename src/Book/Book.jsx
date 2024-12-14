import React, { useState, useRef, useEffect } from "react";
import "./Book.css";

const Book = () => {
  const [books, setBooks] = useState(() => {
    const booksData = localStorage.getItem("booksData");
    return booksData ? JSON.parse(booksData) : [];
  });

  useEffect(() => {
    localStorage.setItem("booksData", JSON.stringify(books));
  }, [books]);

  const title = useRef(null);

  function addBook() {
    if (title.current.value === "") {
      return;
    }
    setBooks((prev) => [
      ...prev,
      {
        title: title.current.value,
        id: Math.random(),
        isEditing: false,
        locked: false,
      },
    ]);
  
  }

  function removeBook(id) {
    let filteredBooks = books.filter((book) => book.id !== id);
    setBooks(filteredBooks);
  }

  function editBook(id) {
    setBooks((prev) =>
      prev.map((book) =>
        book.id === id ? { ...book, isEditing: true, locked: true } : book
      )
    );
  }

  function saveBook(id, updatedTitle) {
    setBooks((prev) =>
      prev.map((book) =>
        book.id === id
          ? { ...book, title: updatedTitle, isEditing: false, locked: false }
          : book
      )
    );
  }

  return (
    <div>
      <input
        className="title-input"
        placeholder="Enter a book's name"
        ref={title}
        type="text"
      />
      <button className="add-book-button" onClick={addBook}>
        Add book
      </button>

      <div className="bookContainer">
        {books.map((book) => (
          <div className="book" key={book.id}>
            <span
              onClick={!book.locked ? () => editBook(book.id) : null}
              className={`edit ${book.locked ? "disabled" : ""}`}
            >
              ✏️
            </span>
            <span
              onClick={() => removeBook(book.id)}
              className="delete"
            >
              ❌
            </span>
            <br />
            <br />
            {book.isEditing ? (
              <>
                <input
                  type="text"
                  defaultValue={book.title}
                  onBlur={(e) => saveBook(book.id, e.target.value)}
                  
                />
                <button className="submit-button" onClick={() => saveBook(book.id, book.title)}>
                  Submit
                </button>
              </>
            ) : (
              <p>{book.title}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Book;
