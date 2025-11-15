import pool from '../Config/Database.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENC_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 12;

export function encryptMessage(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString("hex"),
        content: encrypted,
        tag: authTag.toString("hex")
    };
}

export function decryptMessage({ iv, content, tag }) {
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(iv, "hex"));

    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(content, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
};

export const chatroomController = async (request, response) => {
    return response.json("Hello, World! Chatrooms endpoint is working fine.");
};

export const sendMessageController = async (request, response) => {
    const { body: { senderid, receiverid, message } } = request;

    const client = await pool.connect();

    try {
        const encryptedMessage = encryptMessage(message);

        const query = 'Insert into UserMessages (senderid, receiverid, content, iv, tag) values ($1, $2, $3, $4, $5)';
        const values = [senderid, receiverid, encryptedMessage.content, encryptedMessage.iv, encryptedMessage.tag];

        await client.query("BEGIN");

        await client.query(query, values);

        await client.query("COMMIT");

        return response.status(200).json({ message: "Message sent successfully." });
    } catch (error) {
        console.error('Error sending message:', error);
        await client.query("ROLLBACK");
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};

export const addGroupMemberController = async (request, response) => {
    const { body: { groupid, memberid } } = request;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query('Insert into GroupMembers (groupid, userid) values ($1, $2)', [groupid, memberid]);

        await client.query("COMMIT");

        return response.status(200).json({ message: "Member added to group successfully." });
    } catch (error) {
        console.error('Error adding group member:', error);
        await client.query("ROLLBACK");
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
}

export const createGroupController = async (request, response) => {
    const { body: { groupname, userid } } = request;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query('Insert into Groups (groupname, created_by, created_at) values ($1, $2, current_timestamp)', [groupname, userid]);

        await client.query("COMMIT");

        return response.status(200).json({ message: "Group created successfully." });
    } catch (error) {
        console.error('Error creating group:', error);
        await client.query("ROLLBACK");
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};

export const sendGroupMessageController = async (request, response) => {
    const { body: { senderid, groupid, message } } = request;

    const client = await pool.connect();

    try {
        const query = 'Insert into GroupMessages (senderid, groupid, content) values ($1, $2, $3)';
        const values = [senderid, groupid, message];

        await client.query("BEGIN");

        await client.query(query, values);

        await client.query("COMMIT");

        return response.status(200).json({ message: "Group message sent successfully." });
    } catch (error) {
        console.error('Error sending group message:', error);
        await client.query("ROLLBACK");
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};