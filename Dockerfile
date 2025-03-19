FROM node:10-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD npm run migrate_local && npm run start