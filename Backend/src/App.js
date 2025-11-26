import express from 'express';
import cors from 'cors';

import authenticationRoutes from '../Routes/Authentication.js';
import chatroomRoutes from '../Routes/Chatrooms.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: false,
  })
);

app.use(express.json());

app.use('/auth', authenticationRoutes);
app.use('/chatrooms', chatroomRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});