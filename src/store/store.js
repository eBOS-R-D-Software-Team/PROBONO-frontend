
import { configureStore } from '@reduxjs/toolkit';
import loginReducer from '../reducers/loginReducer';
import neighbourhoodReducer from '../reducers/neighbourhoodReducer'; // Add this line
import labsReducer from '../reducers/labsReducer';

const store = configureStore({
  reducer: {
    login: loginReducer,
    neighbourhood: neighbourhoodReducer, // Add this line
    labs: labsReducer,

  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export default store;
