import { Router } from 'express';
import { authenticationController, signupController, loginController } from '../Controllers/Authentication.js';
import { verifyToken } from '../Middlewares/Authentication.js';

const router = Router();

router.get('/', authenticationController);
router.post('/signup', signupController);
router.post('/login', loginController);
router.get('/profile', verifyToken, (req, res) => {
    return res.json({ message: "This is a protected profile route.", user: req.user });
})

export default router;