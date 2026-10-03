import type { OrganizationSizeBand, OrganizationType } from "@/modules/organizations/domain/organization.types";

export const organizationTypeLabel = {
  company: "Company",
  agency: "Agency",
  consultancy: "Consultancy",
  recruiter: "Recruiter",
  community: "Community",
  other: "Other"
} as const satisfies Record<OrganizationType, string>;

export const sizeBandLabel = {
  solo: "Solo",
  "2_10": "2–10 people",
  "11_50": "11–50 people",
  "51_200": "51–200 people",
  "201_1000": "201–1,000 people",
  "1001_plus": "1,000+ people"
} as const satisfies Record<OrganizationSizeBand, string>;
