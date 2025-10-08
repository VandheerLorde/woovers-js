import { expect, jest } from "bun:test";
import { afterEach, describe, it } from "node:test";
import * as jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../src/auth-middleware";

describe("Self contained unit test for the verifyToken middleware", () => {

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should next the function along in case of success", async() => {
    const mockReq = {
        headers: {
            Authorization: 'Bearer test-token',
        },
    } as unknown as Request;

    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson});

    const mockRes = {
        status: mockStatus,
    } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    jest.spyOn(jwt, 'verify').mockImplementation((...args) => {
        const callback = args[args.length - 1];

        if (typeof callback === 'function') {
            callback(null, { decoded: 'payload'});
        }

        return {
            header: { alg: 'HS256' },
            payload: { decoded: 'payload'},
            signature: 'a-fake-signature',
        } as jwt.Jwt;
    });

    verifyToken(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalled();
    })

    //this is supposed to go after the else to the if upwards here.
    it ("should return an 401 authorization error in case of no stamp", async() => {
        const mockReq = {
            headers: {
                Authorization: 'Bearer wrong-token'
            },
        } as unknown as Request;

        const mockJson = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json: mockJson});

        const mockRes = {
            status: mockStatus,
        } as unknown as Response;

        const mockNext = jest.fn() as NextFunction;

        verifyToken(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith(expect.any(Object));
    })
});