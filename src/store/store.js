
import { configureStore } from '@reduxjs/toolkit';
import loginReducer from '../reducers/loginReducer';
import neighbourhoodReducer from '../reducers/neighbourhoodReducer'; // Add this line
import labsReducer from '../reducers/labsReducer';
import co2Reducer from '../reducers/co2Reducer'

const store = configureStore({
  reducer: {
    login: loginReducer,
    neighbourhood: neighbourhoodReducer, // Add this line
    labs: labsReducer,
    co2: co2Reducer,

  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export default store;
