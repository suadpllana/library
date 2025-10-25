import React from "react";
import { useEffect } from "react";
import "./WishlistModal.css";
import { FaArrowUp } from "react-icons/fa6";
import { FaArrowDown } from "react-icons/fa6";
import { TbXboxXFilled } from "react-icons/tb";
import { toast } from 'react-toastify';

const WishlistModal = ({ watchlist, setWatchlist, setOpenModal, supabase, refreshWishlist }) => {


  async function persistPositions(currentList) {
    try {
      const positions = currentList.map((item, idx) => ({ id: item.id, position: idx }));
      const { error } = await supabase
        .from('wishlist')
        .upsert(positions, { onConflict: 'id' });
      if (error) throw error;
      if (typeof refreshWishlist === 'function') await refreshWishlist();
      toast.success('Wishlist order saved');
    } catch (err) {
      console.error('Error saving wishlist order:', err);
   
    }
  }

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

  const handleClose = async () => {
    await persistPositions(watchlist);
    setOpenModal(false);
  }

  return (
    <div className="wishlist-modal" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}> 
        <h2 style={{textAlign: "center"}}>Sort the order of the books using the buttons up and down</h2>
        {watchlist?.map((book, index) => (
            <React.Fragment key={book.id || index}>
             <div className="book-in-modal">
            <div>
              <img
                src={
                  book.imageLinks?.smallThumbnail ||
                  "https://placehold.co/128x192?text=No+Image"
                }
                alt={book?.title}
              />
              <p>{book.title} - {(book.authors || []).join(", ")}</p>
            </div>
            <div className="sorting-buttons">
                <FaArrowDown onClick={() => moveBookDown(index)} className="icon down"/>
                <FaArrowUp   onClick={() => moveBookUp(index)} className="icon up"/>

            </div>
          </div>
            <hr />
            </React.Fragment>
        ))}
              <TbXboxXFilled onClick={handleClose} className="close-modal"/>

      </div>
    </div>
  );
};

export default WishlistModal;
