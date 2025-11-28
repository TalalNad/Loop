import pool from '../Config/Database.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

dotenv.config();

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

const generateToken = (user) => {
    return jwt.sign(
        { userid: user.userid, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

export const authenticationController = async (request, response) => {
    return response.json(
        'Hello, World! Authentication endpoint is working fine.'
    );
};

export const signUpController = async (request, response) => {
    const { body: { username, password, email } } = request;

    const client = await pool.connect();

    try {
        const usernameCheckQuery = 'Select * from Users where username = $1';
        const emailCheckQuery = 'Select * from Users where email = $1';

        let usernameCheckResult = await pool.query(usernameCheckQuery, [username]);

        if (usernameCheckResult.rowCount) {
            let newUsername = username;

            while (usernameCheckResult.rowCount) {
                let randomIdx = Math.floor(Math.random() * 100);

                newUsername = username + randomIdx;

                usernameCheckResult = await pool.query(usernameCheckQuery, [newUsername]);
            }

            return response.status(400).json(`Username already taken. Try: ${newUsername}`)
        }

        let emailCheckResult = await pool.query(emailCheckQuery, [email]);

        if (emailCheckResult.rowCount)
            return response.status(400).json("Email already registered. Try logging in.");

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await client.query('BEGIN');

        const query = 'Insert into users (username, password, email) values ($1, $2, $3) returning userid, username, email';
        const values = [username, hashedPassword, email];

        const result = await client.query(query, values);

        await client.query('COMMIT');

        const user = result.rows[0];
        const token = generateToken(user);

        return response.status(201).json({
            message: 'User registered successfully with userid: ' + result.rows[0].userid,
            user: result.rows[0],
            token,
        });
    } catch (error) {
        console.error('Error during user signup:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};

export const loginController = async (request, response) => {
    const {
        body: { credential, password },
    } = request;

    try {
        const query = 'Select * from Users where (username = $1 or email = $1)';
        const values = [credential];

        const result = await pool.query(query, values);

        if (!result.rowCount)
            return response.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, result.rows[0].password);

        if (!isMatch)
            return response.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const token = generateToken(user);

        return response.status(200).json({
            message: 'User logged in successfully',
            user: {
                userid: result.rows[0].userid,
                username: result.rows[0].username,
                email: result.rows[0].email,
            },
            token,
        });
    } catch (error) {
        return response.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Search users by username (for the chat search bar).
 * Matches `/auth/users?username=...` used in the frontend.
 */
export const searchUsersController = async (request, response) => {
    try {
        const { username } = request.query;

        if (!username) {
            return response
                .status(400)
                .json({ message: 'Username is required' });
        }

        const query = `
      SELECT userid, username, email
      FROM Users
      WHERE username ILIKE $1
    `;

        // Case-insensitive, partial match
        const values = [`%${username}%`];

        const result = await pool.query(query, values);

        return response.status(200).json({ users: result.rows });
    } catch (error) {
        console.error('Error searching users:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
};