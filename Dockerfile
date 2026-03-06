FROM node:20-alpine

WORKDIR /workspaces/DiscClone

COPY package*.json ./
RUN npm ci --only-production

COPY . .
RUN chown -R node:node /workspaces/DiscClone
USER node

EXPOSE 3000
CMD ["node", "private/server.js"]