import type { BounceStatus, DeliveryStatus, OutreachChannel, ReplyStatus } from "@/modules/outreach/domain/outreach.types";

export const channelLabel = { email: "Email", linkedin: "LinkedIn", inmail: "LinkedIn InMail", other: "Other" } as const satisfies Record<OutreachChannel, string>;

export const deliveryLabel = { sent: "Sent", delivered: "Delivered", failed: "Failed" } as const satisfies Record<DeliveryStatus, string>;

export const bounceLabel = { none: "No bounce", soft: "Soft bounce", hard: "Hard bounce", blocked: "Blocked" } as const satisfies Record<BounceStatus, string>;

export const replyLabel = { none: "No reply", replied: "Replied", auto_reply: "Auto-reply" } as const satisfies Record<ReplyStatus, string>;
