import { Router } from "express";
import { chatroomController } from "../Controllers/Chatrooms.js";

const router = Router();

router.get('/', chatroomController);

export default router;