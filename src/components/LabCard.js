import React from "react";
// We don't import specific icons here anymore since we are using images from the prop
import PropTypes from 'prop-types';

const LabCard = ({ lab, onClick }) => {
  return (
    <div className="lab-card-modern" onClick={onClick}>
      
      {/* 1. Image Section */}
      <div className="image-wrapper">
        {/* We use lab.map as the source, with a fallback alt text */}
        <img 
            src={lab.map} 
            alt={lab.name} 
            onError={(e) => {
                e.target.onerror = null; 
                e.target.src="https://via.placeholder.com/400x200?text=No+Image"; // Optional Fallback
            }}
        />
      </div>

      {/* 2. Content Section */}
      <div className="content-wrapper">
        <h3 className="card-title">{lab.name}</h3>
        <p className="card-description">{lab.description}</p>
        
        {/* Optional: A "Read More" fake link to encourage clicking */}
        <span className="read-more">View Metrics &rarr;</span>
      </div>
    </div>
  );
};

LabCard.propTypes = {
  lab: PropTypes.shape({
    map: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
};

export default LabCard;