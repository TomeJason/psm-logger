# psm-logger

This repository contains code for a message logger built using the following web technologies:

- [Redis](https://redis.io/)
- [Node.js](https://nodejs.org/en/)
- [Express.js](http://expressjs.com/)
- [Socket.IO](http://socket.io/)

The Installation process assumes that you already have the above technologies installed on your machine.

## Install

Use npm install and npm start to run.

The server should start at port 8080 (default).

Although, before doing that, you might want to flush the DB to clear a lot of the logs.

For that, you can uncomment the line in `index.js` that says `client.flushdb();`

Once that is done, you are ready to go.

Nodemon might be a future addition.
