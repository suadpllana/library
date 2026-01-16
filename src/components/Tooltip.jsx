import React, { useState } from 'react';
import './Tooltip.css';

const Tooltip = ({ 
  children, 
  content, 
  position = 'top', // 'top', 'bottom', 'left', 'right'
  delay = 200 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const showTooltip = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    clearTimeout(timeoutId);
    setIsVisible(false);
  };

  return (
    <div 
      className="tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div className={`tooltip tooltip-${position}`}>
          {content}
          <span className="tooltip-arrow"></span>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
