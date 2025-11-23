// Backend/Routes/Chatrooms.js
import { Router } from 'express';
import {
  chatroomController,
  sendMessageController,
  sendGroupMessageController,
  createGroupController,
  addGroupMemberController,
  fetchMessageController,
  fetchChatRoomsController,
  fetchConversationController,
  sendConversationMessageController,
  startChatController,
} from '../Controllers/Chatrooms.js';
import { verifyToken } from '../Middlewares/Authentication.js';

const router = Router();

/**
 * Chat list (left sidebar) for the logged-in user.
 * Frontend: GET /chatrooms
 */
router.get('/', verifyToken, fetchChatRoomsController);

/**
 * Legacy endpoints you already had – kept as-is so nothing breaks.
 */
router.post('/send', sendMessageController);
router.post('/send-group-message', sendGroupMessageController);
router.post('/create-group', createGroupController);
router.post('/add-group-member', addGroupMemberController);
router.get('/messages', fetchMessageController);

/**
 * Start or get a chat with another user by username.
 * Frontend: POST /chatrooms/start  { username }
 */
router.post('/start', verifyToken, startChatController);

/**
 * Conversation between current user and another user.
 * Frontend:
 *   GET  /chatrooms/:id/messages
 *   POST /chatrooms/:id/messages
 * Here :id is the other user's userid.
 */
router.get('/:otherUserId/messages', verifyToken, fetchConversationController);
router.post('/:otherUserId/messages', verifyToken, sendConversationMessageController);

export default router;