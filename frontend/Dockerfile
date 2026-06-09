# --- Build Stage ---
FROM node:lts-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Pass VITE environment variables during build
ARG VITE_API_URL
ARG VITE_IMPRESSUM_NAME
ARG VITE_IMPRESSUM_STREET
ARG VITE_IMPRESSUM_CITY
ARG VITE_IMPRESSUM_EMAIL
ARG VITE_IMPRESSUM_PHONE

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_IMPRESSUM_NAME=${VITE_IMPRESSUM_NAME}
ENV VITE_IMPRESSUM_STREET=${VITE_IMPRESSUM_STREET}
ENV VITE_IMPRESSUM_CITY=${VITE_IMPRESSUM_CITY}
ENV VITE_IMPRESSUM_EMAIL=${VITE_IMPRESSUM_EMAIL}
ENV VITE_IMPRESSUM_PHONE=${VITE_IMPRESSUM_PHONE}

RUN npm run build

# --- Production Stage ---
FROM nginx:stable-alpine
# Copy built files
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Nginx config: SPA + strangler API routing (Django/Rust per-group). See
# nginx.conf for the cutover layout. proxy_params.conf holds shared headers.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY proxy_params.conf /etc/nginx/proxy_params.conf

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
