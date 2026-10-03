import type { Persona, PersonLinkType } from "@/modules/people/domain/person.types";

export const personaLabel = {
  recruiter: "Recruiter",
  fractional_cto: "Fractional CTO",
  agency_founder: "Agency founder",
  agency_delivery_lead: "Agency delivery lead",
  engineering_leader: "Engineering leader",
  founder: "Founder",
  consultant: "Consultant",
  referral_partner: "Referral partner",
  other: "Other"
} as const satisfies Record<Persona, string>;

export const personLinkTypeLabel = {
  linkedin: "LinkedIn",
  website: "Website",
  github: "GitHub",
  portfolio: "Portfolio",
  other: "Other"
} as const satisfies Record<PersonLinkType, string>;
