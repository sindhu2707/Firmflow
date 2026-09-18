import { Router } from "express";
import { 
  getProfile, 
  updateProfile, 
  listOrgUsers, 
  inviteUser, 
  deactivateUser, 
  reactivateUser 
} from "./user.controller";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import { updateProfileSchema, inviteUserSchema } from "./user.validation";
import { requireTenant } from "../../middlewares/tenantScope";
import { authorize } from "../../middlewares/authorize";
import { checkPlanLimit } from "../../middlewares/checkPlanLimit";

const router = Router();

router.use(authenticate);

router.get("/profile", getProfile);
router.patch("/profile", validate(updateProfileSchema), updateProfile);

router.get("/", requireTenant, authorize("org_owner", "employee"), listOrgUsers);

router.post(
  "/invite",
  requireTenant,
  authorize("org_owner", "employee"),
  validate(inviteUserSchema),
  checkPlanLimit('employees'),
  inviteUser
);

router.patch(
  "/:id/deactivate",
  requireTenant,
  authorize("org_owner"),
  deactivateUser
);

router.patch(
  "/:id/reactivate",
  requireTenant,
  authorize("org_owner"),
  reactivateUser
);

export default router;