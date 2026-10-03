import { pgEnum } from "drizzle-orm/pg-core";
import {
  bounceStatusValues, campaignStatusValues, ctaTypeValues, deliveryStatusValues, draftStatusValues, externalRefTypeValues, externalSourceValues, followUpStatusValues, interactionDirectionValues, interactionTypeValues,
  organizationSizeBandValues, organizationTypeValues, outreachChannelValues, personaValues, personLinkTypeValues, proofPointTypeValues, prospectSourceValues, prospectStatusValues,
  prospectTemperatureValues, providerAccountStatusValues, replyStatusValues, sequenceEnrollmentStatusValues, sequenceStatusValues, sentimentValues, signalTypeValues, structuralReasonValues, templateStatusValues, outreachTaskStatusValues, outreachTaskTypeValues
} from "./crm-values";

export const prospectStatusEnum = pgEnum("prospect_status", prospectStatusValues);
export const outreachChannelEnum = pgEnum("outreach_channel", outreachChannelValues);
export const prospectTemperatureEnum = pgEnum("prospect_temperature", prospectTemperatureValues);
export const prospectSourceEnum = pgEnum("prospect_source", prospectSourceValues);
export const structuralReasonEnum = pgEnum("structural_reason", structuralReasonValues);
export const personaEnum = pgEnum("persona", personaValues);
export const organizationTypeEnum = pgEnum("organization_type", organizationTypeValues);
export const organizationSizeBandEnum = pgEnum("organization_size_band", organizationSizeBandValues);
export const personLinkTypeEnum = pgEnum("person_link_type", personLinkTypeValues);
export const signalTypeEnum = pgEnum("signal_type", signalTypeValues);
export const campaignStatusEnum = pgEnum("campaign_status", campaignStatusValues);
export const templateStatusEnum = pgEnum("template_status", templateStatusValues);
export const draftStatusEnum = pgEnum("draft_status", draftStatusValues);
export const sequenceStatusEnum = pgEnum("sequence_status", sequenceStatusValues);
export const sequenceEnrollmentStatusEnum = pgEnum("sequence_enrollment_status", sequenceEnrollmentStatusValues);
export const providerAccountStatusEnum = pgEnum("provider_account_status", providerAccountStatusValues);
export const outreachTaskStatusEnum = pgEnum("outreach_task_status", outreachTaskStatusValues);
export const outreachTaskTypeEnum = pgEnum("outreach_task_type", outreachTaskTypeValues);
export const ctaTypeEnum = pgEnum("cta_type", ctaTypeValues);
export const proofPointTypeEnum = pgEnum("proof_point_type", proofPointTypeValues);
export const deliveryStatusEnum = pgEnum("delivery_status", deliveryStatusValues);
export const bounceStatusEnum = pgEnum("bounce_status", bounceStatusValues);
export const replyStatusEnum = pgEnum("reply_status", replyStatusValues);
export const interactionDirectionEnum = pgEnum("interaction_direction", interactionDirectionValues);
export const interactionTypeEnum = pgEnum("interaction_type", interactionTypeValues);
export const sentimentEnum = pgEnum("sentiment", sentimentValues);
export const followUpStatusEnum = pgEnum("follow_up_status", followUpStatusValues);
export const externalSourceEnum = pgEnum("external_source", externalSourceValues);
export const externalRefTypeEnum = pgEnum("external_ref_type", externalRefTypeValues);
