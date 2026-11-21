# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# CRA bakes REACT_APP_* vars into the JS bundle at build time, not runtime -
# these must be passed as --build-arg when building the image.
ARG REACT_APP_API_URL
ARG REACT_APP_KEYCLOAK_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_KEYCLOAK_URL=${REACT_APP_KEYCLOAK_URL}
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# ─── Runtime stage ──────────────────────────────────────────────────────────
# nginx-unprivileged: same nginx, but runs entirely as a non-root user on
# port 8080 - plays nicely with Kubernetes clusters that enforce restricted
# Pod Security Standards.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
