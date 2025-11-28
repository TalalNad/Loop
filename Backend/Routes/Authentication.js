import { Router } from 'express';
import {
  authenticationController,
  loginController,
  searchUsersController,
  signUpController
} from '../Controllers/Authentication.js';
import { verifyToken } from '../Middlewares/Authentication.js';

const router = Router();

router.get('/', authenticationController);
router.post('/signup', signUpController);
router.post('/login', loginController);

// NEW: search users endpoint used by frontend search bar
router.get('/users', searchUsersController);

router.get('/profile', verifyToken, (req, res) => {
  return res.json({
    message: 'This is a protected profile route.',
    user: req.user,
  });
});

export default router;