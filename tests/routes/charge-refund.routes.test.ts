import { beforeAll, afterAll, describe, it, expect, afterEach, expectTypeOf, beforeEach } from "bun:test";
import { app } from "../../src/app";
import { type Server } from 'http';
import { getDatabaseProvider } from "../../src/database/providers/get-provider";
import { Refund } from "../../src/types/Refund";
import { Charge } from "../../src/types/Charge";
import { randomUUID } from "crypto";

const API_URL = "http://localhost:3001";
let serverProcess: Server;
let requestOptionsGet: RequestInit;
let requestOptionsPost: RequestInit;
let jwtStamp: string;
const { error, provider: db} = getDatabaseProvider();

if (error || !db) {
    throw new Error("Failed to get database provider for testing");
};

describe("Authentication of POST and GET/:id refund routes", () => {

    describe("When the charge exists/is valid", () => {
        let chargeWithRefundId: string;
        let chargeWithoutRefundId: string;
        let createdRefundIds: string[] = [];

        beforeAll(async() =>{

            await new Promise<void>(resolve => {
                serverProcess = app.listen(3001, resolve);
            });
            console.log(`Test server running at ${API_URL}`);

            const testUser = {
            username: 'testusername123',
            password: 'testingpassword',
            };

            const requestOptions = {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(testUser),
            };

            const loginTest = await fetch(`${API_URL}/api/v1/login/`, requestOptions);
            const loginBody = await loginTest.json();
            jwtStamp = loginBody.token;
            console.log({message: 'Logged in!'});

            const mockCharge: Charge = {
                id: 'placeholder-id',
                correlationID: 'placeholder-correlation',
                value: 100,
                type: 'DYNAMIC',
            }
            const charge1 = {
                ...mockCharge,
                id: randomUUID(),
                correlationID: 'charge-with-refunds',
            };
            const charge2 = {
                ...mockCharge,
                id: randomUUID(),
                correlationID: 'charge-without-refunds'
            };

            chargeWithRefundId = await db.createCharge(charge1);
            chargeWithoutRefundId = await db.createCharge(charge2);

            const mockRefund: Omit<Refund, 'id'> = {
                refund_correlationID: 'placeholder',
                value: 20,
                status: 'CONFIRMED',
                time: new Date().toISOString(),
                endToEndId: "E" + randomUUID(),
                charge_correlationID: chargeWithRefundId,
            };

            const refund1 = {
                ...mockRefund,
                refund_correlationID: randomUUID(),
            };

            const refund2 = {
                ...mockRefund,
                refund_correlationID: randomUUID(),
            };

            createdRefundIds.push(refund1.refund_correlationID);
            createdRefundIds.push(refund2.refund_correlationID);

            await db.createChargeRefund(refund1);
            await db.createChargeRefund(refund2);
        });

        afterAll(async() => {
            for(const id of createdRefundIds) {
                await db.deleteRefundsByID(id)
            };

            await db.deleteCharge(chargeWithRefundId);
            await db.deleteCharge(chargeWithoutRefundId);
        });

        it("GET/:id charge that has valid refunds associated, return -> 200 OK and Data", async() => {
            requestOptionsGet = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwtStamp}`
                },
                
            };
            const response = await fetch(`${API_URL}/api/v1/charge/${chargeWithRefundId}/refund`, requestOptionsGet);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.data).toHaveLength(2);
        });

        it("GET/:id charge with no valid refunds associated, return -> 404 Not Found and error", async() => {
            requestOptionsGet = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwtStamp}`
                },
            };
            const response = await fetch(`${API_URL}/api/v1/charge/${chargeWithoutRefundId}/refund`, requestOptionsGet);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.data).toHaveLength(0);
        });

        it("POST a refund on a charge that exists, return -> 201 Created and JSON", async() => {
            const newRefund = {
                refund_correlationID: randomUUID(),
                value: 20,
            };

            requestOptionsPost = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwtStamp}`
                },
                body: JSON.stringify(newRefund)
            };
            const response = await fetch(`${API_URL}/api/v1/charge/${chargeWithRefundId}/refund`, requestOptionsPost);
            expect(response.status).toBe(201);
            const data = await response.json();
            expect(data).toMatchObject(newRefund);
        });

        it("POST a refund on a charge that exists with improper body, return -> 400 Bad Request and Error", async() => {
            const invalidRefund = {
                refund_correlationID: undefined,
                value: undefined
            };

            requestOptionsPost = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwtStamp}`
                },
                body: JSON.stringify(invalidRefund)
            };
            const response = await fetch(`${API_URL}/api/v1/charge/${chargeWithRefundId}/refund`, requestOptionsPost);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data).toHaveProperty('error', 'Request body was formatted improperly');
        });
    });

    describe("When the charge is invalid", () => {
        it("GET/:id charge that doesn't exist, returns -> 404 Not Found and Error", async() => {
            const invalidCorrelationID = randomUUID();
            requestOptionsGet = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwtStamp}`
                },
            };
            const response = await fetch(`${API_URL}/api/v1/charge/${invalidCorrelationID}/refund`, requestOptionsGet);
            expect(response.status).toBe(404);
            const data = await response.json();
            expect(data).toHaveProperty('error', 'Couldnt find the requested charge');
        });

        it("POST a refund on a charge that doesn't exist, returns -> 404 Not Found and Error", async() => {
            const invalidCorrelationID = randomUUID();
            const invalidRefund = {
                refund_correlationID: randomUUID(),
                value: 20
            };
            requestOptionsPost = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwtStamp}`
                },
                body: JSON.stringify(invalidRefund)
            };
            const response = await fetch(`${API_URL}/api/v1/charge/${invalidCorrelationID}/refund`, requestOptionsPost);
            expect(response.status).toBe(404);
            const data = await response.json();
            expect(data).toHaveProperty('error', 'Couldnt find any charge to attach the refund to');
        });
    });

    describe("Self-contained tests for the /charge-refund/ route", () => {
        afterAll(async () => {
            await new Promise<void>((resolve, reject) => {
                serverProcess.close((err) => {
                    if (err) return reject(err);
                resolve();
                });
            });
            console.log("Test server has been closed.");
        });
    });
});