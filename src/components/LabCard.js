// components/LabCard.jsx
import React from 'react';
import './LabCard.scss';

const LabCard = ({ lab }) => {
  return (
    <div className="lab-card">
      <div className="lab-card__map">
        <img src={lab.map} alt={`${lab.name} map`} />
      </div>
      <div className="lab-card__details">
        <h3>{lab.name}</h3>
        <p>{lab.description}</p>
      </div>
    </div>
  );
};

export default LabCard;
