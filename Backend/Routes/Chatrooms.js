import { Router } from "express";
import {
    chatroomController,
    sendMessageController,
    sendGroupMessageController,
    createGroupController,
    addGroupMemberController,
    fetchMessageController
} from "../Controllers/Chatrooms.js";

const router = Router();

router.get('/', chatroomController);
router.post('/send', sendMessageController);
router.post('/send-group-message', sendGroupMessageController);
router.post('/create-group', createGroupController);
router.post('/add-group-member', addGroupMemberController);
router.get('/messages', fetchMessageController);

export default router;