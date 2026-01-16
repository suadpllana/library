import React, { useState, useEffect } from "react";
import "./WishlistModal.css";
import { IoClose } from "react-icons/io5";
import { MdDragIndicator } from "react-icons/md";
import { FaArrowLeft, FaGripVertical } from "react-icons/fa6";
import { toast } from 'react-toastify';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../lib/supabase';

// Fix for react-beautiful-dnd with React 18 StrictMode
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};

const WishlistModal = ({ watchlist, setWatchlist, setOpenModal, refreshWishlist }) => {
  const [hasChanges, setHasChanges] = useState(false);

  async function persistPositions(currentList) {
    try {
      const updates = currentList.map((item, idx) => 
        supabase
          .from('wishlist')
          .update({ position: idx })
          .eq('id', item.id)
      );
      
      await Promise.all(updates);
      
      if (typeof refreshWishlist === 'function') await refreshWishlist();
      toast.success('Wishlist order saved!');
    } catch (err) {
      console.error('Error saving wishlist order:', err);
      toast.error('Failed to save wishlist order');
    }
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(watchlist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setWatchlist(items);
    setHasChanges(true);
  };

  const handleClose = async () => {
    if (hasChanges) {
      await persistPositions(watchlist);
    }
    setOpenModal(false);
  };

  return (
    <div className="wishlist-modal-overlay" onClick={handleClose}>
      <div className="wishlist-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wishlist-modal-header">
          <button className="back-btn" onClick={handleClose}>
            <FaArrowLeft />
            <span>Back</span>
          </button>
          <h2>Sort Your Wishlist</h2>
          <button className="close-btn" onClick={handleClose}>
            <IoClose />
          </button>
        </div>

        {/* Content */}
        <div className="wishlist-modal-body">
          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="wishlist">
              {(provided, snapshot) => (
                <div 
                  className={`droppable-container ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {watchlist?.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">📚</span>
                      <p>Your wishlist is empty</p>
                    </div>
                  ) : (
                    watchlist?.map((book, index) => (
                      <Draggable key={String(book.id)} draggableId={String(book.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`wishlist-card ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            <div className="drag-handle">
                              <FaGripVertical />
                            </div>
                            <span className="position-number">{index + 1}</span>
                            <img
                              src={book.imageLinks?.smallThumbnail || "https://placehold.co/128x192?text=No+Image"}
                              alt={book?.title}
                              className="book-thumb"
                            />
                            <div className="book-details">
                              <h4>{book.title}</h4>
                              <p>{(book.authors || []).join(", ") || "Unknown Author"}</p>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </StrictModeDroppable>
          </DragDropContext>
        </div>

        {/* Footer */}
        <div className="wishlist-modal-footer">
          <p className="hint-text">
            <MdDragIndicator /> Drag items to reorder your reading priority
          </p>
          <button className="save-btn" onClick={handleClose}>
            {hasChanges ? 'Save & Close' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WishlistModal;
