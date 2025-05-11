import React, { useEffect, useState } from 'react';
import ReactModal from 'react-modal';
import "./LoanedBooks.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

ReactModal.setAppElement('#root');

const LoanedBooks = ({ loanedBooks, setLoanedBooks }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [selectedBookInfo, setSelectedBookInfo] = useState({ title: "", client: "" });

  useEffect(() => {
    const loanedBooksData = localStorage.getItem("loanedBooksData");
    if (loanedBooksData) {
      setLoanedBooks(JSON.parse(loanedBooksData));
    }
  }, []);

  const openModal = (id) => {
    const book = loanedBooks.find(book => book.id === id);
    setSelectedBookId(id);
    setSelectedBookInfo({
      title: book?.bookData?.volumeInfo?.title || "Unknown Title",
      client: book?.clientName || "Unknown Client"
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedBookId(null);
    setSelectedBookInfo({ title: "", client: "" });
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    const updatedBooks = loanedBooks.filter(book => book.id !== selectedBookId);
    setLoanedBooks(updatedBooks);
    localStorage.setItem("loanedBooksData", JSON.stringify(updatedBooks));
    toast.success("Loaned book deleted successfully!");
    closeModal();
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
                    <button className="delete-loaned-book" onClick={() => openModal(book.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-loans-info">No books loaned yet.</p>
      )}

      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Delete Confirmation"
        className="custom-modal"
        overlayClassName="custom-overlay"
      >
        <h2>Confirm Deletion</h2>
        <p>
          Are you sure you want to delete <strong>{selectedBookInfo.title}</strong> borrowed by <strong>{selectedBookInfo.client}</strong>?
        </p>
        <div className="modal-actions">
          <button onClick={confirmDelete} className="confirm">Yes, Delete</button>
          <button onClick={closeModal} className="cancel">Cancel</button>
        </div>
      </ReactModal>

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
