import { beforeAll, afterAll, describe, it, expect, afterEach, expectTypeOf, beforeEach } from "bun:test";
import { app } from "../../src/app";
import { type Server } from 'http';
import { getDatabaseProvider } from "../../src/database/providers/get-provider";

const API_URL = "http://localhost:3001";
let serverProcess: Server;
let userToDelete: string | undefined;
let requestOptions: RequestInit;
const { error, provider: db} = getDatabaseProvider();

if (error || !db) {
    throw new Error("Failed to get database provider for testing");
};


describe("Authentication of both POST routes", () => {
    describe("When the user is valid/existing", () => {
        beforeEach(async () => {
        userToDelete = "testuser-" + Date.now();
        const newUser = {
            username: userToDelete,
            password: "test-password124",
        };
        requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(newUser),
        }
        });

        afterEach(async () => {
        if(userToDelete) {
            console.log('Cleaning user table!');
            db.deleteUserByUsername(userToDelete);
            userToDelete = undefined;
            }
        });

        it("Register route -> Should return a 201", async() => {
            const response = await fetch(`${API_URL}/api/v1/register/`, requestOptions);
            expect(response.status).toBe(201);
        });

        it("Register route -> Should return a 409", async() => {
            const firstResponse = await fetch (`${API_URL}/api/v1/register/`, requestOptions);
            const secondResponse = await fetch(`${API_URL}/api/v1/register/`, requestOptions);

            expect(firstResponse.status).toBe(201);
            expect(secondResponse.status).toBe(409);
        });

        it("Login route -> Should return a 200 and the JWT token", async() => {
            const registrationSuccess = await fetch (`${API_URL}/api/v1/register/`, requestOptions);
            expect(registrationSuccess.status).toBe(201);

            const loginSuccess = await fetch(`${API_URL}/api/v1/login/`, requestOptions);
            expect(loginSuccess.status).toBe(200);

            const loginBody = await loginSuccess.json();
            expect(loginBody).toHaveProperty('token');
            expect(loginBody.token).toEqual(expect.any(String));
        });
    })

    describe("When the username/password is invalid", () => {
        it("Login route invalid username -> Should return a 401", async() =>{
            const invalidUsername = {
                username: "nonexistent-user",
                password: "nonexistent-password",
            };
            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(invalidUsername),
            };

            const failedUsername = await fetch(`${API_URL}/api/v1/login/`, requestOptions);
            expect(failedUsername.status).toBe(401);
        });

        it("Login route invalid password -> should return a 401", async() =>{
            const invalidPassword = {
                username: "testusername123",
                password: "nonexistent-password",
            };
            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(invalidPassword),
            };

            const failedPassword = await fetch(`${API_URL}/api/v1/login/`, requestOptions);
            expect(failedPassword.status).toBe(401);
        });
    })

    describe("Self-contained tests for the /auth/ route", () => {
    beforeAll(async () => {
        await new Promise<void>(resolve => {
            serverProcess = app.listen(3001, resolve);
        });
        console.log(`Test server running at ${API_URL}`);
    });

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
})