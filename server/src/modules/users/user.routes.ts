import { Router } from "express";
import { getProfile, updateProfile, listOrgUsers } from "./user.controller";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import { updateProfileSchema } from "./user.validation";
import { requireTenant } from "../../middlewares/tenantScope";
import { authorize } from "../../middlewares/authorize";
import { inviteUser } from "./user.controller";
import { inviteUserSchema } from "./user.validation";
import { checkPlanLimit } from "../../middlewares/checkPlanLimit";

const router = Router();

router.use(authenticate);
router.get("/profile", getProfile);
router.patch("/profile", validate(updateProfileSchema), updateProfile);
router.use(authenticate);
router.get("/profile", getProfile);
router.patch("/profile", validate(updateProfileSchema), updateProfile);
router.get("/", requireTenant, listOrgUsers);
router.get("/", requireTenant, authorize("org_owner", "employee"), listOrgUsers)
router.post(
  "/invite",
  requireTenant,
  authorize("org_owner", "employee"),
  validate(inviteUserSchema),
  checkPlanLimit('employees'),
  inviteUser
);

export default router;