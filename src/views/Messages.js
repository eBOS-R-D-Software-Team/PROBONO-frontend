import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNeighbourhoods } from '../actions/neighbourhoodActions';

const NeighbourhoodsComponent = () => {
  const dispatch = useDispatch();
  const neighbourhoods = useSelector((state) => state.neighbourhoods.data);
  const loading = useSelector((state) => state.neighbourhoods.loading);
  const error = useSelector((state) => state.neighbourhoods.error);

  useEffect(() => {
    dispatch(fetchNeighbourhoods());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Neighbourhoods</h1>
      <ul>
        {neighbourhoods.map((neighbourhood) => (
          <li key={neighbourhood.id}>{neighbourhood.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default NeighbourhoodsComponent;
