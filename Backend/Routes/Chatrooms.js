import { Router } from "express";
import { chatroomController, sendMessageController } from "../Controllers/Chatrooms.js";

const router = Router();

router.get('/', chatroomController);
router.post('/send', sendMessageController);

export default router;