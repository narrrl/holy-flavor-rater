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

# Custom Nginx config to handle React Router (SPA) and proxy API requests
RUN printf 'server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /api/ {\n\
        proxy_pass http://holy-backend:8000/api/;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
    location /admin/ {\n\
        proxy_pass http://holy-backend:8000/admin/;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
    location /static/ {\n\
        proxy_pass http://holy-backend:8000/static/;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
    location /media/ {\n\
        proxy_pass http://holy-backend:8000/media/;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
