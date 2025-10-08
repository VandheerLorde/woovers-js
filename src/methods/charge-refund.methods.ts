import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const getRefundsforCharge = async (req: Request, res: Response) => {
    const { correlationID } = req.params;
    const { db } = req.context;
    const { limit = 10, offset = 0 } = req.query;

    const chargeResult = await db.getChargeByID(correlationID!);

    if (!chargeResult) {
        return res.status(404).send({ error: 'Couldnt find the requested charge'});
    }

    const dbResult = await db.getRefundsByChargeCorrelationID(correlationID!, Number(limit), Number(offset));

    if (!dbResult) {
        return res.status(404).send({ error: 'Couldnt find any refunds'});
    }

    return res.status(200).json(dbResult);
};

export const createRefund = async (req: Request, res:Response) => {
    const { correlationID } = req.params;
    const { db } = req.context;

    if (!correlationID) {
        return res.status(404).send({ error: 'Couldnt find the requested charge'});
    }

    if (req.body.refund_correlationID === undefined || req.body.value === undefined) {
        return res.status(400).send({error: 'Request body was formatted improperly'})
    };

    const dbSearch = await db.getChargeByID(correlationID)

    if (dbSearch === null) {
        return res.status(404).send({error: 'Couldnt find any charge to attach the refund to'})
    };

    const { charge_correlationID, refund_correlationID, value, comment } = req.body;
    const status = "CONFIRMED"; // Have to add an issue to generate status-processing for the refunds
    const time = new Date().toISOString();
    const endToEndId = "E" + randomUUID();

    const refund = {charge_correlationID, refund_correlationID, endToEndId, time, status, value, comment};

    await db.createChargeRefund(refund);

    return res.status(201).send(refund);
}