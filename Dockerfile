FROM node:20-alpine
WORKDIR /app
COPY index.html package.json tsconfig.json vite.config.ts ./
RUN npm install
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]
