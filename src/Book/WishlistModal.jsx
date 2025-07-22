import React from "react";
import { useEffect, useState } from "react";
import "./WishlistModal.css";
import { FaArrowUp } from "react-icons/fa6";
import { FaArrowDown } from "react-icons/fa6";
import { TbXboxXFilled } from "react-icons/tb";

const WishlistModal = ({ watchlist, setWatchlist, setOpenModal }) => {

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);


    function moveBookDown(index){
    if(index < watchlist.length - 1){
      const updatedWatchlist = [...watchlist];
      [updatedWatchlist[index], updatedWatchlist[index + 1]] = [updatedWatchlist[index + 1] , updatedWatchlist[index]];
    setWatchlist(updatedWatchlist)
    }
  }
  function moveBookUp(index){
    if(index > 0){
      const updatedWatchlist = [...watchlist];
      [updatedWatchlist[index], updatedWatchlist[index - 1]] = [updatedWatchlist[index - 1] , updatedWatchlist[index]];
    setWatchlist(updatedWatchlist)
    }
  }


  return (
    <div className="wishlist-modal" onClick={() => setOpenModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}> 
        <h2 style={{textAlign: "center"}}>Sort the order of the books using the buttons up and down</h2>
        {watchlist?.map((book, index) => (
            <>
             <div className="book-in-modal" key={index}>
            <div>
              <img
                src={
                  book.imageLinks?.smallThumbnail ||
                  "https://placehold.co/128x192?text=No+Image"
                }
                alt={book?.title}
              />  <p>{book.title} - {book.authors.join(", ")}</p>
            </div>
            <div className="sorting-buttons">
                <FaArrowDown onClick={() => moveBookDown(index)} className="icon down"/>
                <FaArrowUp   onClick={() => moveBookUp(index)} className="icon up"/>

            </div>
          </div>
            <hr />
            </>
         
        ))}
              <TbXboxXFilled onClick={() => setOpenModal(false)} className="close-modal"/>

      </div>
    </div>
  );
};

export default WishlistModal;
