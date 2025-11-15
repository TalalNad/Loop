import pool from '../Config/Database.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const chatroomController = async (request, response) => {
    return response.json("Hello, World! Chatrooms endpoint is working fine.");
};