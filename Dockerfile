FROM node:alpine
WORKDIR /usr/src/app
COPY server /usr/src/app
RUN npm ci --only=production
EXPOSE 5000
CMD ["node", "svr.js"]
