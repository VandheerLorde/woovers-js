import { Request, Response } from "express";
import { DatabaseProvider } from "../database/types";
import { compareSync, hashSync } from "bcrypt";
import jwt from 'jsonwebtoken';

export const handleLogin = async (req: Request, res: Response) => {

    const { username, password } = req.body;
    const { db } = req.context;

    const loginUsername = await db.findUserByUsername(username);

    if (!loginUsername) {
        return res.status(401).send({error: 'Invalid credentials'})
    }

    if (loginUsername) {
        const loginApproved = compareSync(password, loginUsername.password_hash);

        if (loginApproved) {
            if (process.env.JWT_SECRET){
                const payload = {
                userId: loginUsername.id
                }
                const stamp = process.env.JWT_SECRET;
                const tokenExpiration = {
                    expiresIn: 86400,
                }
                const token = jwt.sign(payload, stamp, tokenExpiration);
                return res.status(200).json({token});
            }
        } else {
            return res.status(401).send({error: 'Invalid credentials'});
        }
    }
}

export const handleRegister = async ( req: Request, res: Response) => {
    const { username, password } = req.body;
    const { db } = req.context;

    const usernameCheck = await db.findUserByUsername(username);

    if (usernameCheck) {
        return res.status(409).send({error: 'Username already taken'})
    }
        const password_hash = hashSync(password, 10);
        const user = {username, password_hash};

        db.createUser(user);
        return res.status(201).send('Account created successfully!')
}