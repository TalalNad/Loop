import { Router } from 'express';
import { authenticationController, signupController, loginController } from '../Controllers/Authentication.js';

const router = Router();

router.get('/', authenticationController);
router.post('/signup', signupController);
router.post('/login', loginController);

export default router;