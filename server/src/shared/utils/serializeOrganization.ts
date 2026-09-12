import { HydratedDocument } from "mongoose";
import { IOrganization } from "../../modules/organizations/organization.model";

export function serializeOrganization(
  org: HydratedDocument<IOrganization>
) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    ownerId: org.ownerId,
    firmId: org.firmId,
  };
}
