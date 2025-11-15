import pool from '../Config/Database.js';

export const authenticatinController = async (request, response) => {
    return response.json("Hello, World! Authentication endpoint is working fine.");
};

export const signupController = async (request, response) => {
    const { body: { username, password, email } } = request;

    const client = await pool.connect();

    try {
        const usernameCheckQuery = 'Select * from Users where username = $1';
        const emailCheckQuery = 'Select * from Users where email = $1';

        const usernameCheckResult = await client.query(usernameCheckQuery, [username]);

        if (usernameCheckResult.rowCount)
            return response.status(400).json({ message: "Username already taken. Try another one." });

        const emailCheckResult = await client.query(emailCheckQuery, [email]);

        if (emailCheckResult.rowCount)
            return response.status(400).json({ message: "Email already registered. Try logging in." });

        await client.query('BEGIN');

        const query = 'Insert into users (username, password, email) values ($1, $2, $3) returning *';
        const values = [username, password, email];

        const result = await client.query(query, values);

        await client.query('COMMIT');

        return response.status(201).json({
            message: "User registered successfully with userid: " + result.rows[0].userid,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error during user signup:', error);
        await client.query('ROLLBACK');
        return response.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};

export const loginController = async (request, response) => {
    const { body: { credential, password } } = request;

    try {
        const query = 'Select * from Users where (username = $1 or email = $1) and password = $2';

        const values = [credential, password];

        const result = await pool.query(query, values);

        if (!result.rowCount)
            return response.status(404).json({ error: 'User not found' });

        return response.status(200).json({
            message: "User logged in successfully",
            user: {
                userid: result.rows[0].userid,
                username: result.rows[0].username,
                email: result.rows[0].email
            }
        });
    } catch (error) {
        return response.status(500).json({ error: 'Internal Server Error' });
    }
};