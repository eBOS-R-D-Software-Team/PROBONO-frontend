# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# CI=false: CRA would otherwise fail the build on ESLint warnings when CI=true
# GENERATE_SOURCEMAP=false: smaller image, no source exposed in production
# NODE_OPTIONS: the bundle (vtk.js, plotly, itk) needs more heap than the default
ENV CI=false \
    GENERATE_SOURCEMAP=false \
    NODE_OPTIONS=--max-old-space-size=4096

# npm ci (not npm install) so @kitware/vtk.js stays pinned to 29.7.1 from the lockfile
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# REACT_APP_* values are read from .env here and baked into the JS bundle.
# .env is not in git - create it from .env.example (or from a CI file variable) before building.
COPY . .
RUN test -f .env || { echo "ERROR: .env not found. Copy .env.example to .env and fill in the values." >&2; exit 1; }
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1
