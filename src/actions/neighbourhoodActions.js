import axios from 'axios';
import {
  fetchNeighbourhoodsStart,
  fetchNeighbourhoodsSuccess,
  fetchNeighbourhoodsFailure,
} from '../reducers/neighbourhoodReducer';

const API_URL = process.env.REACT_APP_API_URL;

export const fetchNeighbourhoods = () => async (dispatch) => {
  dispatch(fetchNeighbourhoodsStart());
  try {
    const response = await axios.get(`${API_URL}/neighbourhoods/`, {
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
    });
    console.log('Response:', response); 
    dispatch(fetchNeighbourhoodsSuccess(response.data.neighbourhoods));
  } catch (error) {
    console.error('Error fetching neighbourhoods:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    dispatch(fetchNeighbourhoodsFailure(error.message));
  }
};
