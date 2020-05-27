FROM node:8.11.1

WORKDIR /usr/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]
