// src/components/ToolCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const ToolCard = ({ title, link, icon: Icon, onClick }) => {
  // Determine if the link is external (starts with http)
  const isExternal = link && (link.startsWith('http') || link.startsWith('www'));

  // Common content for the card
  const cardContent = (
    <>
      <div className="icon-wrapper">
        {/* Render function icons (like your custom image) or React Icons components */}
        {typeof Icon === 'function' ? <Icon size={48} /> : <Icon style={{ fontSize: 48 }} />}
      </div>
      <h3 className="card-title">{title}</h3>
    </>
  );

  // Styling class
  const cardClass = "tool-card-modern";

  // Case 1: External Link
  if (isExternal) {
    return (
      <a href={link} className={cardClass} onClick={onClick} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  // Case 2: Internal Router Link
  if (link) {
    return (
      <Link to={link} className={cardClass} onClick={onClick}>
        {cardContent}
      </Link>
    );
  }

  // Case 3: Button (no link)
  return (
    <div className={cardClass} onClick={onClick}>
      {cardContent}
    </div>
  );
};

ToolCard.propTypes = {
  title: PropTypes.string.isRequired,
  link: PropTypes.string,
  icon: PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired,
  onClick: PropTypes.func,
};

export default ToolCard;