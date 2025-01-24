// Card.js
import React from 'react';
import { NavLink } from 'react-router-dom';


const Card = ({ icon: Icon, title, link, onClick }) => {
  return (
    <NavLink to={link} className="custom-card" onClick={onClick}>
      <div className="card-icon">
        <Icon />
      </div>
      <div className="card-title">
        {title}
      </div>
    </NavLink>
  );
};

export default Card;
