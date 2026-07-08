FROM node:20-alpine
WORKDIR /app
RUN npm init -y && npm install express multer
COPY blog.js .
EXPOSE 80
CMD ["node", "blog.js"]
