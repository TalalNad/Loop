import { Router } from "express";
import {
    chatroomController,
    sendMessageController,
    sendGroupMessageController,
    createGroupController
} from "../Controllers/Chatrooms.js";

const router = Router();

router.get('/', chatroomController);
router.post('/send', sendMessageController);
router.post('/send-group-message', sendGroupMessageController);
router.post('/create-group', createGroupController);

export default router;