import pool from '../Config/Database.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENC_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 12;

export function encryptMessage(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        content: encrypted,
        tag: authTag.toString('hex'),
    };
}

export function decryptMessage({ iv, content, tag }) {
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        ENC_KEY,
        Buffer.from(iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

export const chatroomController = async (request, response) => {
    return response.json('Hello, World! Chatrooms endpoint is working fine.');
};

// -------------------- DIRECT MESSAGE (USER TO USER) --------------------

export const sendMessageController = async (request, response) => {
    const {
        body: { senderid, receiverid, message },
    } = request;

    const client = await pool.connect();

    try {
        const encryptedMessage = encryptMessage(message);

        const query =
            'Insert into UserMessages (senderid, receiverid, content, iv, tag) values ($1, $2, $3, $4, $5)';
        const values = [
            senderid,
            receiverid,
            encryptedMessage.content,
            encryptedMessage.iv,
            encryptedMessage.tag,
        ];

        await client.query('BEGIN');

        await client.query(query, values);

        await client.query('COMMIT');

        return response
            .status(200)
            .json({ message: 'Message sent successfully.' });
    } catch (error) {
        console.error('Error sending message:', error);
        await client.query('ROLLBACK');
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};

export const fetchMessageController = async (request, response) => {
    const {
        body: { userid },
    } = request;

    try {
        const result = await pool.query(
            'Select * from UserMessages where receiverid = $1',
            [userid],
        );

        const messages = result.rows.map((row, index) => {
            const decryptedContent = decryptMessage({
                iv: row.iv,
                content: row.content,
                tag: row.tag,
            });

            return {
                id: row.id ?? index + 1, // fallback if there is no id column
                senderid: row.senderid,
                receiverid: row.receiverid,
                content: decryptedContent,
            };
        });

        return response.status(200).json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
};

// NEW: list all conversations (chat list) for the logged-in user
export const fetchChatRoomsController = async (request, response) => {
    try {
        const myId = request.user.userid; // from verifyToken

        // 1) Get ALL messages involving this user (no ORDER BY id!)
        const convResult = await pool.query(
            `
            SELECT
              CASE
                WHEN senderid = $1 THEN receiverid
                ELSE senderid
              END AS other_user_id,
              content,
              iv,
              tag
            FROM UserMessages
            WHERE senderid = $1 OR receiverid = $1
            `,
            [myId],
        );

        // If no messages at all, no chatrooms
        if (convResult.rows.length === 0) {
            return response.status(200).json({ chatrooms: [] });
        }

        // 2) For each other_user_id, keep only the FIRST row we see
        const seen = new Set();
        const lastRows = [];

        for (const row of convResult.rows) {
            if (!seen.has(row.other_user_id)) {
                seen.add(row.other_user_id);
                lastRows.push(row);
            }
        }

        const otherUserIds = lastRows.map((r) => r.other_user_id);

        // 3) Fetch usernames/emails for all other users
        const usersRes = await pool.query(
            'SELECT userid, username, email FROM Users WHERE userid = ANY($1)',
            [otherUserIds],
        );

        const usersById = new Map();
        for (const u of usersRes.rows) {
            usersById.set(u.userid, u);
        }

        // 4) Build chatrooms array with decrypted last message
        const chatrooms = lastRows.map((row, index) => {
            const user = usersById.get(row.other_user_id);
            const decrypted = decryptMessage({
                iv: row.iv,
                content: row.content,
                tag: row.tag,
            });

            return {
                id: row.other_user_id, // used as chatroomId in frontend
                name: user?.username || `User ${row.other_user_id}`,
                otherUserid: row.other_user_id,
                lastMessage: decrypted,
                lastMessageTime: null, // you can add timestamp later
                unread: 0, // add real unread count later
            };
        });

        return response.status(200).json({ chatrooms });
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
};

// NEW: fetch conversation between current user and another user (used by frontend /chatrooms/:id/messages)
export const fetchConversationController = async (request, response) => {
    try {
        const myId = request.user.userid; // set by verifyToken middleware
        const { otherUserId } = request.params;

        const result = await pool.query(
            `SELECT * FROM UserMessages
             WHERE (senderid = $1 AND receiverid = $2)
                OR (senderid = $2 AND receiverid = $1)`,
            [myId, otherUserId],
        );

        const messages = result.rows.map((row, index) => {
            const decryptedContent = decryptMessage({
                iv: row.iv,
                content: row.content,
                tag: row.tag,
            });

            return {
                id: row.id ?? index + 1, // fallback if there is no id column
                fromMe: row.senderid === myId,
                content: decryptedContent,
                sentAt: row.created_at || null,
            };
        });

        return response.status(200).json({ messages });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
};

// NEW: send message in a conversation (used by frontend POST /chatrooms/:id/messages)
export const sendConversationMessageController = async (
    request,
    response,
) => {
    const myId = request.user.userid; // from verifyToken
    const { otherUserId } = request.params;
    const { content } = request.body;

    if (!content || !content.trim()) {
        return response
            .status(400)
            .json({ error: 'Message content is required' });
    }

    const client = await pool.connect();

    try {
        const encryptedMessage = encryptMessage(content.trim());

        const query =
            'Insert into UserMessages (senderid, receiverid, content, iv, tag) values ($1, $2, $3, $4, $5) RETURNING *';
        const values = [
            myId,
            otherUserId,
            encryptedMessage.content,
            encryptedMessage.iv,
            encryptedMessage.tag,
        ];

        await client.query('BEGIN');

        const result = await client.query(query, values);

        await client.query('COMMIT');

        const row = result.rows[0];
        const decryptedContent = decryptMessage({
            iv: row.iv,
            content: row.content,
            tag: row.tag,
        });

        return response.status(201).json({
            message: {
                id: row.id ?? null, // may be null if no id column
                fromMe: true,
                content: decryptedContent,
                sentAt: row.created_at || null,
            },
        });
    } catch (error) {
        console.error('Error sending conversation message:', error);
        await client.query('ROLLBACK');
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};

// NEW: start or get a chat with another user by username (used by frontend POST /chatrooms/start)
export const startChatController = async (request, response) => {
    try {
        const myId = request.user.userid; // from verifyToken
        const { username } = request.body;

        if (!username) {
            return response
                .status(400)
                .json({ error: 'Username is required' });
        }

        const userResult = await pool.query(
            'SELECT userid, username, email FROM Users WHERE username = $1 LIMIT 1',
            [username],
        );

        if (userResult.rows.length === 0) {
            return response.status(404).json({ error: 'User not found' });
        }

        const otherUser = userResult.rows[0];
        const otherUserId = otherUser.userid;

        // For now we treat the chatroom ID as the other user's ID
        const chatroom = {
            id: otherUserId,
            name: otherUser.username,
            otherUserid: otherUserId,
            lastMessage: null,
            lastMessageTime: null,
            unread: 0,
        };

        return response.status(200).json({ chatroom });
    } catch (error) {
        console.error('Error starting chat:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
};

// -------------------- GROUP CHAT --------------------

export const addGroupMemberController = async (request, response) => {
    const {
        body: { groupid, memberid },
    } = request;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'Insert into GroupMembers (groupid, userid) values ($1, $2)',
            [groupid, memberid],
        );

        await client.query('COMMIT');

        return response
            .status(200)
            .json({ message: 'Member added to group successfully.' });
    } catch (error) {
        console.error('Error adding group member:', error);
        await client.query('ROLLBACK');
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};

export const createGroupController = async (request, response) => {
    const {
        body: { groupname, userid },
    } = request;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'Insert into Groups (groupname, created_by, created_at) values ($1, $2, current_timestamp)',
            [groupname, userid],
        );

        await client.query('COMMIT');

        return response
            .status(200)
            .json({ message: 'Group created successfully.' });
    } catch (error) {
        console.error('Error creating group:', error);
        await client.query('ROLLBACK');
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};

export const sendGroupMessageController = async (request, response) => {
    const { body: { senderid, groupid, message } } = request;

    const client = await pool.connect();

    try {
        const encryptedMessage = encryptMessage(message);

        const query = `Insert into GroupMessages (senderid, groupid, sent_at, content, iv, tag) 
        values ($1, $2, current_timestamp, $3, $4, $5)`;

        const values = [senderid, groupid, encryptedMessage.content, encryptedMessage.iv, encryptedMessage.tag];

        await client.query("BEGIN");

        await client.query(query, values);

        await client.query("COMMIT");

        return response.status(200).json({ message: 'Group message sent successfully.' });
    } catch (error) {
        console.error('Error sending group message:', error);
        await client.query("ROLLBACK");
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
}