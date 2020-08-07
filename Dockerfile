FROM node:8.11.1

WORKDIR /usr/app

COPY package*.json /usr/app/
RUN npm install

COPY . .

EXPOSE 5000

ENTRYPOINT [ "npm", "run" ]
CMD ["start"]
