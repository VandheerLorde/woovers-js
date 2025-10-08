import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import * as jwt from 'jsonwebtoken'

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  console.log("Verifying path:", req.path);

const publicRoutes = [
  '/api/v1/login/',
  '/api/v1/register/'
]
const authHeader = req.headers.authorization;

if (publicRoutes.includes(req.path)) {
  return next();
}

if (!authHeader || Array.isArray(authHeader) || !authHeader.startsWith('Bearer')){
  return res.status(401).json({ error: 'Invalid authorization header'});
}
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Authorization header formated incorrectly'});
  }
  const token = parts[1]

  if (!token){
    return res.status(401).json({error: 'Missing stamped token'})
  }

  if (!process.env.JWT_SECRET){
    return res.status(500).json({ error: 'Server configuration error'});
  }

  const validToken = jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    next();
    } 
  );
}