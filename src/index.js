import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ReactKeycloakProvider } from '@react-keycloak/web';

import store from './store/store';
import keycloak from './keycloak';
import App from './App';
import './index.css';
// third-party styles …
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

const eventLogger = (event, error) => {
  if (event === 'onTokenExpired') keycloak.updateToken(60);
  console.log(event, error || '');
};

const root = createRoot(document.getElementById('root'));

root.render(
  <ReactKeycloakProvider
    authClient={keycloak}
    initOptions={{ onLoad: 'login-required', pkceMethod: 'S256' }}
    onEvent={eventLogger}
  >
    <Provider store={store}>
      <App />
    </Provider>
  </ReactKeycloakProvider>
);
