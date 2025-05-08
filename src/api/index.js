// ── src/api/index.js ───────────────────────────────────────────
import axios from 'axios';
import keycloak from '../keycloak';          // adjust the path if keycloak.js lives elsewhere

// Main axios instance for *your own* back-end
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

// Attach Keycloak token (and silently refresh) on every request
api.interceptors.request.use(async config => {
  if (keycloak.token && keycloak.isTokenExpired()) {
    await keycloak.updateToken(60);         // refresh if <60 s left
  }
  config.headers.Authorization = `Bearer ${keycloak.token}`;
  return config;
}, error => Promise.reject(error));          // keep axios error chain intact

export default api;
