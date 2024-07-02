import React from "react";
import { Provider } from "react-redux";
import { createRoot } from 'react-dom/client';
//import { BrowserRouter } from "react-router-dom";
import store from "./store/store";
import App from "./App";
import "./index.css";
// Import the styles
import "../node_modules/bootstrap/scss/bootstrap.scss";
import "./assets/assets/scss/main.scss";
import "./assets/assets/scss/color_skins.scss";
//import "../node_modules/font-awesome/css/font-awesome.min.css";
import 'primereact/resources/themes/saga-blue/theme.css';  // Import theme
import 'primereact/resources/primereact.min.css';  // Import PrimeReact CSS
import 'primeicons/primeicons.css';  // Import PrimeIcons

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <Provider store={store}>
      <App />
  </Provider>
);
