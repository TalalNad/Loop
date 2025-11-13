import { Router } from 'express';
import { authenticatinController, signupController, loginController } from '../Controllers/Authentication.js';

const router = Router();

router.get('/', authenticatinController);
router.post('/signup', signupController);
router.post('/login', loginController);

export default router;