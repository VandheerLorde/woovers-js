import { getQrCodeStaticByID, getQrCodeStatic, createQrCodeStatic } from "../methods/pixqrcode.methods";
import { Router } from 'express';

const qrCodeRouter = Router();

qrCodeRouter.get('/qrcode-static/:id', getQrCodeStaticByID );

qrCodeRouter.get('/qrcode-static/', getQrCodeStatic );

qrCodeRouter.post('/qrcode-static/', createQrCodeStatic );

export default qrCodeRouter;