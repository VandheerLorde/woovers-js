import { Router } from 'express';
import { getRefundsforCharge } from '../methods/charge-refund.methods';
import { createRefund } from '../methods/charge-refund.methods';

const chargeRefundRouter = Router();
const route = '/charge/:correlationID/refund';

chargeRefundRouter.get(route, getRefundsforCharge);
chargeRefundRouter.post(route, createRefund);

export default chargeRefundRouter;