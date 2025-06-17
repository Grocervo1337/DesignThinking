# --- Étape 1: Build ---
FROM node:18-alpine AS build

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code du frontend
COPY . .

# Construire l'application pour la production
RUN npm run build

# --- Étape 2: Production ---
FROM nginx:1.21.0-alpine

# Copier les fichiers construits depuis l'étape de build
COPY --from=build /app/build /usr/share/nginx/html

# Copier une configuration Nginx personnalisée si nécessaire
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port 80
EXPOSE 80

# La commande par défaut de Nginx s'occupe de démarrer le serveur
CMD ["nginx", "-g", "daemon off;"] 