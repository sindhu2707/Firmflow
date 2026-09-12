import { Router } from "express";
import { createOrganization, getMyOrganization } from "./organization.controller";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import { createOrganizationSchema } from "./organization.validation";
import { authorize } from "../../middlewares/authorize";
import { requireTenant } from "../../middlewares/tenantScope";
import { getDashboardSummary } from "./dashboard.controller";

const router = Router();

router.use(authenticate);
router.post("/", validate(createOrganizationSchema), createOrganization);
router.get("/me", requireTenant, getMyOrganization);
router.get("/all", authorize("super_admin"), async (req, res) => {
  const organizations = await (await import("./organization.model")).Organization.find();
  res.status(200).json({ success: true, data: { organizations } });
});
router.get("/dashboard", requireTenant, getDashboardSummary);
export default router;