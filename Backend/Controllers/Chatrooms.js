import pool from '../Config/Database.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY;
const iv = crypto.randomBytes(16);

export const chatroomController = async (request, response) => {
    return response.json("Hello, World! Chatrooms endpoint is working fine.");
};