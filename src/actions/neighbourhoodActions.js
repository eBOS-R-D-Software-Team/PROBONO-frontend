// src/actions/neighbourhoodActions.js
import axios from 'axios';
import {
  fetchNeighbourhoodsStart,
  fetchNeighbourhoodsSuccess,
  fetchNeighbourhoodsFailure,
} from '../reducers/neighbourhoodReducer';

export const fetchNeighbourhoods = () => async (dispatch) => {
  dispatch(fetchNeighbourhoodsStart());
  try {
    const response = await axios.get('http://168.119.15.247:3537/porto/report/neighbourhoods/', {
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
    console.log('Response:', response); 
    dispatch(fetchNeighbourhoodsSuccess(response.data.neighbourhoods));
  } catch (error) {
    console.log('Error:', error);
    dispatch(fetchNeighbourhoodsFailure(error.message));
  }
};
