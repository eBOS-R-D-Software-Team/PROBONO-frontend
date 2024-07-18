// Action Types
export const UPDATE_EMAIL = "loginReducer/UPDATE_EMAIL";
export const UPDATE_PASSWORD = "loginReducer/UPDATE_PASSWORD";
export const ON_LOGGEDIN = "loginReducer/ON_LOGGEDIN";

// Action Creators
export const updateEmail = (val) => (dispatch) => {
  dispatch({
    type: UPDATE_EMAIL,
    payload: val,
  });
};

export const updatePassword = (val) => (dispatch) => {
  dispatch({
    type: UPDATE_PASSWORD,
    payload: val,
  });
};

// Simulate a static authentication process
export const onLoggedin = () => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { email, password } = getState().login;

    // Static credentials check
    const staticEmail = "admin@probono.com";
    const staticPassword = "test123";

    console.log("Checking credentials..."); // Debug log
    if (email === staticEmail && password === staticPassword) {
      localStorage.setItem("isLoggedIn", "true");
      dispatch({
        type: ON_LOGGEDIN,
        payload: true,
      });
      console.log("Credentials valid, resolving promise..."); // Debug log
      resolve();
    } else {
      console.log("Credentials invalid, rejecting promise..."); // Debug log
      reject();
    }
  });
};

// Action for logging out
export const onLogout = () => (dispatch) => {
  localStorage.removeItem("isLoggedIn");  // Clear login state
  dispatch({
    type: ON_LOGGEDIN,
    payload: false,
  });
};
