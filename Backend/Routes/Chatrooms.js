import { Router } from "express";
import { chatroomController, sendMessageController, sendGroupMessageController } from "../Controllers/Chatrooms.js";

const router = Router();

router.get('/', chatroomController);
router.post('/send', sendMessageController);
router.post('/send-group-message', sendGroupMessageController);

export default router;