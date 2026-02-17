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

# Custom Nginx config to handle React Router (SPA)
RUN printf 'server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
