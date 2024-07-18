
import { configureStore } from '@reduxjs/toolkit';
import loginReducer from '../reducers/loginReducer';
import neighbourhoodReducer from '../reducers/neighbourhoodReducer'; // Add this line

const store = configureStore({
  reducer: {
    login: loginReducer,
    neighbourhood: neighbourhoodReducer, // Add this line
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export default store;
