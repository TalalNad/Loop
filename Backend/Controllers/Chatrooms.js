import pool from '../Config/Database.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const chatroomController = async (request, response) => {
    return response.json("Hello, World! Chatrooms endpoint is working fine.");
};

export const sendMessageController = async (request, response) => {
    const { body: { senderid, receiverid, message } } = request;

    const client = await pool.connect();

    try {
        const query = 'Insert into UserMessages (senderid, receiverid, content) values ($1, $2, $3)';
        const values = [senderid, receiverid, message];

        await client.query("BEGIN");

        await client.query(query, values);

        await client.query("COMMIT");

        return response.status(201).json({ message: "Message sent successfully." });
    } catch (error) {
        console.error('Error sending message:', error);
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

        return response.status(201).json({ message: "Group message sent successfully." });
    } catch (error) {
        console.error('Error sending group message:', error);
        await client.query("ROLLBACK");
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};