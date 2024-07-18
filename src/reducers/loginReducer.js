import {
  UPDATE_EMAIL,
  UPDATE_PASSWORD,
  ON_LOGGEDIN,
} from "../actions/LoginAction";


const initialState = {
  email: '',
  password: '',
  isLoggedIn: localStorage.getItem("isLoggedIn") === "true",
};

const loginReducer = (state = initialState, action) => {
  switch (action.type) {
    case UPDATE_EMAIL:
      return {
        ...state,
        email: action.payload,
      };
    case UPDATE_PASSWORD:
      return {
        ...state,
        password: action.payload,
      };
    case ON_LOGGEDIN:
      return {
        ...state,
        isLoggedIn: action.payload,
      };
    default:
      return state;
  }
};

export default loginReducer;


