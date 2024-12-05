# Build stage
FROM node:12-alpine AS build

WORKDIR /app
COPY ab-frontend/package*.json ./
COPY games.json ./
RUN npm install

COPY ab-frontend/ .
RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy built static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8000

CMD ["nginx", "-g", "daemon off;"]
