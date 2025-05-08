import api from '../api';
import {
  fetchNeighbourhoodsStart,
  fetchNeighbourhoodsSuccess,
  fetchNeighbourhoodsFailure,
} from '../reducers/neighbourhoodReducer';

const API_URL = process.env.REACT_APP_API_URL;

export const fetchNeighbourhoods = () => async (dispatch) => {
  dispatch(fetchNeighbourhoodsStart());
  const url = `${API_URL}/neighbourhoods/`
  console.log("url : ", url);
  try {
    const response = await api.get(`${url}`, {
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
