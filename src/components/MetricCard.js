import React from 'react';
import PropTypes from 'prop-types';

const MetricCard = ({ title, icon, onClick }) => {
  return (
    <div className="metric-card-modern" onClick={onClick}>
      <div className="icon-wrapper">
        {/* Render icon directly if it's an element, or as component */}
        {React.isValidElement(icon) ? icon : <span className="fallback-icon">?</span>}
      </div>
      <h3 className="card-title">{title}</h3>
    </div>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func,
};

export default MetricCard;