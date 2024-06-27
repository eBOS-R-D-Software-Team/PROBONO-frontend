import { configureStore } from '@reduxjs/toolkit';
import loginReducer from '../reducers/loginReducer'; // Ensure this path is correct

const store = configureStore({
  reducer: {
    login: loginReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export default store;
