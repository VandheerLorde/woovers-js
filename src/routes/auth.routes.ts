import { Router } from "express";
import { handleLogin, handleRegister } from "../methods/auth.methods";

const userRouter = Router();

userRouter.post('/login', handleLogin);
userRouter.post('/register', handleRegister);

export default userRouter;