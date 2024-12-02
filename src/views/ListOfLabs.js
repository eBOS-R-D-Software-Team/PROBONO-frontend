import React from 'react';
import { useSelector } from 'react-redux';
import { selectLabs } from '../store/labsSlice';
import LabCard from '../components/LabCard';

const ListOfLabs = () => {
  const labs = useSelector(selectLabs);

  return (
    <div className="list-of-labs">
      {labs.map((lab) => (
        <LabCard key={lab.id} lab={lab} />
      ))}
    </div>
  );
};

export default ListOfLabs;
