import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false,
    },
});

(async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to the database successfully');
        client.release();
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
})();

export default pool;