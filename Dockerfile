FROM node:8.11.1

WORKDIR /usr/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
