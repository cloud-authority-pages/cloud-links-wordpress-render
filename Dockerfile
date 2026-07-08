FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PLATFORM_NAME="Cloud Links WordPress"
ENV PLATFORM_COLOR="#21759b"
ENV PLATFORM_ACCENT="#d54e21"
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
