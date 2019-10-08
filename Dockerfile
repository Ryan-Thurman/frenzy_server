FROM node:8.11.1

WORKDIR /usr/app

COPY package.json package-lock*.json /usr/app/
RUN npm install

COPY . .

ENV NODE_CONFIG_STRICT_MODE=false
EXPOSE 3000

ENTRYPOINT [ "npm", "run" ]
CMD ["start"]
