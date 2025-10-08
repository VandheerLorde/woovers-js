import express, { Request, Response, NextFunction, ErrorRequestHandler, response } from 'express';
import { apiKey } from './utils/utils';
import qrCodeStaticRouter from './routes/qrcode-static.routes';
import { getDatabaseProvider } from './database/providers/get-provider';
import { contextMiddleware } from './context-middleware';
import { verifyToken } from './auth-middleware';
import userStaticRouter from './routes/auth.routes';
import chargeRefundRouter from './routes/charge-refund.routes';

const app = express();

const {error, provider: db} = getDatabaseProvider();

if (error || !db) {
  throw new Error('Database provider not found');
}

app.use(express.json());
app.use(contextMiddleware(db));
app.use(verifyToken);
app.use('/api/v1/', userStaticRouter );
app.use('/api/v1/', qrCodeStaticRouter );
app.use('/api/v1/', chargeRefundRouter );

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error("UNHANDLED ERROR", err.stack);

  res.status(500).json({ error: "An internal server error occurred" });
}

app.use(errorHandler);

export {app, apiKey};
