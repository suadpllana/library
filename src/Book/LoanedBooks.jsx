import React, { useEffect } from 'react';
import "./LoanedBooks.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LoanedBooks = ({ loanedBooks, setLoanedBooks }) => {

  useEffect(() => {
    const loanedBooksData = localStorage.getItem("loanedBooksData");
    if (loanedBooksData) {
      setLoanedBooks(JSON.parse(loanedBooksData));
    }
  }, []);

  const handleDelete = (id) => {
    const updatedBooks = loanedBooks.filter(book => book.id !== id);
    setLoanedBooks(updatedBooks);
    localStorage.setItem("loanedBooksData", JSON.stringify(updatedBooks));
    toast.success("Loaned book deleted successfully!");
  };

  return (
    <div className='loaned-books'>
      {loanedBooks.length > 0 ? (
        <div className='loaned-books-header'>
          <h2>Loaned Books</h2>
          <table border="1" className='loaned-books-table'>
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Book Author</th>
                <th>Name</th>
                <th>Borrow Date</th>
                <th>Return Date</th>
                <th>Status</th>
                <th>Action</th> 
              </tr>
            </thead>
            <tbody>
              {loanedBooks.map((book) => (
                <tr key={book.id}>
                  <td>{book?.bookData?.volumeInfo?.title}</td>
                  <td>{book.bookData.volumeInfo.authors ? book.bookData.volumeInfo.authors.join(", ") : "Not found"}</td>
                  <td>{book.clientName}</td>
                  <td>{book.borrowDate}</td>
                  <td>{book.returnDate}</td>
                  <td>Active</td>
                  <td>
                    <button className="delete-loaned-book" onClick={() => handleDelete(book.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-loans-info">No books loaned yet.</p>
      )}
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
    </div>
  );
};

export default LoanedBooks;
