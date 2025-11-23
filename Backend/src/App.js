import express from 'express';
import cors from 'cors';

import pool from '../Config/Database.js';
import authenticationRoutes from '../Routes/Authentication.js';
import chatroomRoutes from '../Routes/Chatrooms.js';

const app = express();
const PORT = process.env.PORT || 4000;

// CORS – allow frontend dev server
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: false, // flip to true later if you use cookies
  })
);

// Body parser
app.use(express.json());

// Routes
app.use('/auth', authenticationRoutes);
app.use('/chatrooms', chatroomRoutes);

// Simple health check
app.get('/', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.listen(PORT, () => {   
  console.log(`Server is running on http://localhost:${PORT}`);
});