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

export const chatroomController = async (_request, response) => {
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
      'INSERT INTO UserMessages (senderid, receiverid, content, iv, tag) VALUES ($1, $2, $3, $4, $5)';
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

    return response.status(200).json({ message: 'Message sent successfully.' });
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
      'SELECT * FROM UserMessages WHERE receiverid = $1',
      [userid],
    );

    const messages = result.rows.map((row, index) => {
      const decryptedContent = decryptMessage({
        iv: row.iv,
        content: row.content,
        tag: row.tag,
      });

      return {
        id: row.id ?? index + 1, // safe even if there is no id column
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

// -------------------- CHAT LIST (SIDEBAR) --------------------

export const fetchChatRoomsController = async (request, response) => {
  try {
    const myId = request.user.userid; // from verifyToken

    // Direct conversations – we do NOT assume any id/created_at column.
    // We just pull all messages and pick the first occurrence per other user.
    const directResult = await pool.query(
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

    const seen = new Set();
    const lastRows = [];

    for (const row of directResult.rows) {
      if (!seen.has(row.other_user_id)) {
        seen.add(row.other_user_id);
        lastRows.push(row);
      }
    }

    const otherUserIds = lastRows.map((r) => r.other_user_id);
    let usersById = new Map();

    if (otherUserIds.length > 0) {
      const usersRes = await pool.query(
        'SELECT userid, username, email FROM Users WHERE userid = ANY($1)',
        [otherUserIds],
      );

      usersById = new Map();
      for (const u of usersRes.rows) {
        usersById.set(u.userid, u);
      }
    }

    const directChatrooms = lastRows.map((row) => {
      const user = usersById.get(row.other_user_id);
      const decrypted = decryptMessage({
        iv: row.iv,
        content: row.content,
        tag: row.tag,
      });

      return {
        id: row.other_user_id,
        name: user?.username || `User ${row.other_user_id}`,
        otherUserid: row.other_user_id,
        lastMessage: decrypted,
        lastMessageTime: null, // no timestamp column in UserMessages
        unread: 0,
        isGroup: false,
      };
    });

    // Groups where this user is a member – GroupMessages is assumed to have sent_at
    const groupsResult = await pool.query(
      `
      SELECT
        g.groupid,
        g.groupname,
        gm_last.content,
        gm_last.iv,
        gm_last.tag,
        gm_last.sent_at
      FROM Groups g
      JOIN GroupMembers gm ON gm.groupid = g.groupid
      LEFT JOIN LATERAL (
        SELECT content, iv, tag, sent_at
        FROM GroupMessages gm2
        WHERE gm2.groupid = g.groupid
        ORDER BY gm2.sent_at DESC
        LIMIT 1
      ) gm_last ON TRUE
      WHERE gm.userid = $1
      `,
      [myId],
    );

    const groupChatrooms = groupsResult.rows.map((row) => {
      let lastMessage = '';
      if (row.content && row.iv && row.tag) {
        lastMessage = decryptMessage({
          iv: row.iv,
          content: row.content,
          tag: row.tag,
        });
      }

      return {
        id: row.groupid,
        groupid: row.groupid,
        name: row.groupname,
        lastMessage,
        lastMessageTime: row.sent_at || null,
        unread: 0,
        isGroup: true,
      };
    });

    const chatrooms = [...directChatrooms, ...groupChatrooms];

    return response.status(200).json({ chatrooms });
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
};

// -------------------- 1:1 CONVERSATION --------------------

export const fetchConversationController = async (request, response) => {
  try {
    const myId = request.user.userid;
    const { otherUserId } = request.params;

    // No ORDER BY id or created_at, because table doesn't have those
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
        id: row.id ?? index + 1,
        fromMe: String(row.senderid) === String(myId),
        content: decryptedContent,
        sentAt: null, // we don't have a timestamp column
      };
    });

    return response.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
};

export const sendConversationMessageController = async (request, response) => {
  const myId = request.user.userid;
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
      'INSERT INTO UserMessages (senderid, receiverid, content, iv, tag) VALUES ($1, $2, $3, $4, $5) RETURNING *';
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
        id: row.id ?? null,
        fromMe: true,
        content: decryptedContent,
        sentAt: null,
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

export const startChatController = async (request, response) => {
  try {
    const { username } = request.body;

    if (!username) {
      return response.status(400).json({ error: 'Username is required' });
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

    const chatroom = {
      id: otherUserId,
      name: otherUser.username,
      otherUserid: otherUserId,
      lastMessage: null,
      lastMessageTime: null,
      unread: 0,
      isGroup: false,
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
    body: { groupid, userid },
  } = request;

  if (!groupid || !userid) {
    return response
      .status(400)
      .json({ error: 'groupid and userid are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO GroupMembers (groupid, userid) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [groupid, userid],
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
    body: { groupname },
  } = request;

  const myId = request.user.userid;

  if (!groupname || !groupname.trim()) {
    return response.status(400).json({ error: 'groupname is required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const groupRes = await client.query(
      'INSERT INTO Groups (groupname, created_by, created_at) VALUES ($1, $2, current_timestamp) RETURNING groupid, groupname, created_by, created_at',
      [groupname.trim(), myId],
    );

    const group = groupRes.rows[0];

    // Ensure creator is a member of the group
    await client.query(
      'INSERT INTO GroupMembers (groupid, userid) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [group.groupid, myId],
    );

    await client.query('COMMIT');

    return response.status(201).json({
      message: 'Group created successfully.',
      group,
    });
  } catch (error) {
    console.error('Error creating group:', error);
    await client.query('ROLLBACK');
    return response.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
};

export const sendGroupMessageController = async (request, response) => {
  const myId = request.user.userid;
  const {
    body: { groupid, message },
  } = request;

  if (!groupid || !message || !message.trim()) {
    return response
      .status(400)
      .json({ error: 'groupid and message are required' });
  }

  const client = await pool.connect();

  try {
    const encryptedMessage = encryptMessage(message.trim());

    const query = `
      INSERT INTO GroupMessages (senderid, groupid, sent_at, content, iv, tag)
      VALUES ($1, $2, current_timestamp, $3, $4, $5)
      RETURNING senderid, groupid, sent_at, content, iv, tag
    `;

    const values = [
      myId,
      groupid,
      encryptedMessage.content,
      encryptedMessage.iv,
      encryptedMessage.tag,
    ];

    await client.query('BEGIN');
    const result = await client.query(query, values);
    await client.query('COMMIT');

    const row = result.rows[0];
    const decrypted = decryptMessage({
      iv: row.iv,
      content: row.content,
      tag: row.tag,
    });

    return response.status(201).json({
      message: {
        id: null,              // no id column in GroupMessages
        groupid: row.groupid,
        fromMe: true,
        senderid: myId,
        content: decrypted,
        sentAt: row.sent_at || null,
      },
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    await client.query('ROLLBACK');
    return response.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
};
export const fetchGroupMessageController = async (request, response) => {
  const {
    params: { groupid },
  } = request; 

  try {
    const result = await pool.query(
      'SELECT * FROM FetchGroupMessages WHERE groupid = $1 ORDER BY sent_at ASC',
      [groupid],
    );

    const messages = result.rows.map((row, index) => {
      const decryptedMessage = decryptMessage({
        iv: row.iv,
        content: row.content,
        tag: row.tag,
      });

      return {
        id: row.id ?? index + 1,
        username: row.username,
        senderid: row.senderid,
        content: decryptedMessage,
        sentAt: row.sent_at || row.created_at || null,
      };
    });

    return response.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
};