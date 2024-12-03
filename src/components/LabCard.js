import React from "react";
//import "./LabCard.scss";

const LabCard = ({ lab, onClick }) => {
  return (
    <div className="lab-card" onClick={() => onClick(lab.name)}>
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
