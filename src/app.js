import express from 'express';
import path from 'path';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';

import logger from './logger';

import baseRoutes from './routes/baseRoutes';
import initCron from './services/cronService';

logger.info('------------------------------------');
logger.info('STARTED TECHIRED ANALYTICA.');
logger.info('------------------------------------');

// connect to Mongo DB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
logger.info(`Connected to ${process.env.MONGO_URI}`);

const app = express();
app.disable('x-powered-by');

app.use(
  morgan('combined', {
    // stream: logger.stream,
    skip: () => app.get('env') === 'test'
  })
);

// enable CORS
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/', baseRoutes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.httpCode = '404';
  err.code = '404';
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  const { code, message } = err;
  res.status(err.httpCode || 500).json({ code, message });
});

initCron();

export default app;
