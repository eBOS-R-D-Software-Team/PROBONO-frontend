import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectLabs } from "../reducers/labsReducer";
import LabCard from "../components/LabCard";
import { SlArrowRight } from "react-icons/sl"; // Breadcrumb icon

const ListOfLabs = () => {
  const labs = useSelector(selectLabs);
  const navigate = useNavigate();

  const handleLabClick = (labName) => {
    navigate(`/metrics`); // Redirect to Environmental Metrics UI
  };

  return (
    <div className="list-of-labs">
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight /> <span>List of Labs</span>
      </div>
      {labs.map((lab) => (
        <LabCard key={lab.id} lab={lab} onClick={handleLabClick} />
      ))}
    </div>
  );
};

export default ListOfLabs;
