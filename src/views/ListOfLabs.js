import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectLabs } from "../reducers/labsReducer";
import LabCard from "../components/LabCard";
import { SlArrowRight } from "react-icons/sl";

const ListOfLabs = () => {
  const labs = useSelector(selectLabs);
  const navigate = useNavigate();

  return (
    <div className="list-of-labs-page">
      
      {/* Sleek Breadcrumb (Consistent with ListOfTools) */}
      <div className="breadcrumb-container">
        <a href="/" className="crumb-link">Home</a>
        <SlArrowRight className="crumb-arrow" />
        <span className="crumb-current">Data Visualizations</span>
      </div>

      <div className="labs-grid-container">
        {labs.map((lab) => (
          <LabCard 
            key={lab.id} 
            lab={lab} 
            onClick={() => navigate(`/labs/${lab.id}/metrics`)} 
          />
        ))}
      </div>
    </div>
  );
};

export default ListOfLabs;