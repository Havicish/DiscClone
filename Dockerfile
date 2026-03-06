FROM node:jod-trixie-slim

WORKDIR /workspaces/DiscClone

COPY . .
RUN npm ci --only-production
RUN chown -R node:node /workspaces/DiscClone

USER node

EXPOSE 3000
CMD ["node", "private/server.js"]