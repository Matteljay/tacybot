FROM node:alpine
WORKDIR /usr/src/app
COPY server /usr/src/app
RUN npm install -g pnpm && pnpm install --prod
EXPOSE 5000
CMD ["node", "svr.js"]
