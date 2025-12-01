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
  fetchGroupMessageController,
} from '../Controllers/Chatrooms.js';
import { verifyToken } from '../Middlewares/Authentication.js';
import { verifyGroupMember } from '../Middlewares/Chatrooms.js';

const router = Router();

// Simple health check / debug route
router.get('/health', chatroomController);

/**
 * Chat list (left sidebar) for the logged-in user.
 * Frontend: GET /chatrooms
 */
router.get('/', verifyToken, fetchChatRoomsController);

/**
 * Legacy direct-message endpoints (kept for backwards compatibility).
 * These are not used by the new React frontend but left here so older
 * clients don't break.
 */
router.post('/send', sendMessageController);
router.get('/messages', fetchMessageController);

/**
 * Start or get a chat with another user by username.
 * Frontend: POST /chatrooms/start  { username }
 */
router.post('/start', verifyToken, startChatController);

/**
 * Conversation between current user and another user.
 * Frontend:
 *   GET  /chatrooms/:otherUserId/messages
 *   POST /chatrooms/:otherUserId/messages
 * Here :otherUserId is the other user's userid.
 */
router.get('/:otherUserId/messages', verifyToken, fetchConversationController);
router.post(
  '/:otherUserId/messages',
  verifyToken,
  sendConversationMessageController,
);

/**
 * GROUP CHAT ROUTES
 */
// Create a group (creator is automatically added as member)
router.post('/create-group', verifyToken, createGroupController);

// Add a member to a group
router.post('/add-group-member', verifyToken, addGroupMemberController);

// Send a message to a group (only if member)
router.post(
  '/send-group-message',
  verifyToken,
  verifyGroupMember,
  sendGroupMessageController,
);

// Fetch messages for a group (only if member)
router.get(
  '/chatroom/group/:groupid',
  verifyToken,
  verifyGroupMember,
  fetchGroupMessageController,
);

export default router;