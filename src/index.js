import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ReactKeycloakProvider } from '@react-keycloak/web';

import store from './store/store';
import keycloak from './keycloak';
import App from './App';
// third-party styles …
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import "./index.css";
// Import the styles
import "../node_modules/bootstrap/scss/bootstrap.scss";
import "./assets/assets/scss/main.scss";
import "./assets/assets/scss/color_skins.scss";


class CrashCatcher extends React.Component {
  state = { err: null };

  componentDidCatch(err) {
    this.setState({ err });
    console.error('UI crash:', err);        // still logs in console
  }

  render() {
    if (this.state.err) {
      return (
        <pre style={{ whiteSpace: 'pre-wrap', color: 'red', padding: 24 }}>
          {this.state.err.toString()}
        </pre>
      );
    }
    return this.props.children;
  }
}

const eventLogger = (event, error) => {
  console.log('[KC]', event, error || '');
  if (event === 'onTokenExpired') {
    keycloak.updateToken(60);
  }
  if (event === 'onAuthSuccess') {
    // clear the hash but keep whatever path+search you started with
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', pathname + search);
  }
};

const root = createRoot(document.getElementById('root'));

root.render(
  <CrashCatcher>

<ReactKeycloakProvider
  authClient={keycloak}
  initOptions={{
    onLoad: 'login-required',
    pkceMethod: 'S256',
    // redirect to the current full URL (no replaceState hack needed)
    redirectUri: window.location.origin + window.location.pathname + window.location.search,
    checkLoginIframe: false
  }}
  onEvent={eventLogger}
>
    <Provider store={store}>
      <App />
    </Provider>
  </ReactKeycloakProvider>
  </CrashCatcher>
);
