import { Router } from 'express';
import { body } from 'express-validator';
import { signupController } from '../controllers/signup.controller';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.post(
  '/verify-pan',
  [
    body('registrationType').notEmpty().withMessage('Registration type is required'),
    body('orgName').trim().notEmpty().withMessage('Organization name is required'),
    body('pan').matches(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/).withMessage('Valid PAN is required'),
  ],
  validate,
  signupController.verifyPan
);

router.post(
  '/save-contact',
  [
    body('pan').notEmpty().withMessage('PAN is required'),
    body('contactName').trim().notEmpty().withMessage('Contact name is required'),
    body('contactEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('contactMobile').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile is required'),
    body('orgAddress').trim().notEmpty().withMessage('Organization address is required'),
    body('orgStateId').isInt().withMessage('State is required'),
    body('orgDistrictId').isInt().withMessage('District is required'),
  ],
  validate,
  signupController.saveContact
);

router.post(
  '/verify-otp',
  [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP is required'),
  ],
  validate,
  signupController.verifyOtp
);

router.post(
  '/resend-otp',
  [body('sessionId').notEmpty().withMessage('Session ID is required')],
  validate,
  signupController.resendOtp
);

export default router;
