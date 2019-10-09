'use strict';

const cors = require('cors');
const hsts = require('hsts');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const boom = require('express-boom');
const morgan = require('morgan');

const awsServerlessExpress = require('aws-serverless-express');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');

const router = require('./routes');

const app = express();
app.use(awsServerlessExpressMiddleware.eventContext());

// logging config
morgan.token('error_obj', (req, res) => {
  if (res.statusCode !== 200) {
    return res.error;
  }
  return undefined;
});
morgan.format(
  'combined',
  '[:date[clf]] ":method :url HTTP/:http-version"'
  + ':status :res[content-length] ":referrer" ":user-agent" :error_obj'
);

// Config
app.use(boom());
app.use(morgan('combined'));
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // for parsing application/json
app.use(hsts({ maxAge: 31536000 }));

// v1 routes
app.use('/v1', router);

// default routes
app.use('/', router);

// global 404 response when page is not found
app.use((req, res) => {
  res.boom.notFound('requested page not found');
});

// catch all error handling
app.use((err, req, res, _next) => {
  res.error = JSON.stringify(err, Object.getOwnPropertyNames(err));
  return res.boom.badImplementation('Something broke!');
});

const server = awsServerlessExpress.createServer(app, null);

module.exports = {
  app,
  handler: (event, context) => awsServerlessExpress.proxy(server, event, context)
};
