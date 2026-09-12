import { Router } from "express";
import { register, login, refresh, logout, changePassword } from "./auth.controller";
import { validate } from "../../middlewares/validate";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "./auth.validation";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword
);

export default router;