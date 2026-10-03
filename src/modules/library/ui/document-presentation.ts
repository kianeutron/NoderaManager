import AltRouteRounded from "@mui/icons-material/AltRouteRounded";
import ArticleRounded from "@mui/icons-material/ArticleRounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import CampaignRounded from "@mui/icons-material/CampaignRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import PictureAsPdfRounded from "@mui/icons-material/PictureAsPdfRounded";
import TableChartRounded from "@mui/icons-material/TableChartRounded";
import TrackChangesRounded from "@mui/icons-material/TrackChangesRounded";
import type { DocumentCategory } from "@/modules/library/domain/document.schema";
import type { DocumentLinkRelation, DocumentLinkTargetType, ExtractionStatus } from "@/modules/library/domain/document.types";

type CategoryTone = "primary" | "secondary" | "success" | "warning" | "info";

export const categoryMeta = {
  proposal: { label: "Proposal", tone: "primary" },
  contract: { label: "Contract", tone: "warning" },
  pitch_deck: { label: "Pitch deck", tone: "secondary" },
  case_study: { label: "Case study", tone: "success" },
  one_pager: { label: "One-pager", tone: "info" },
  portfolio: { label: "Portfolio", tone: "secondary" },
  research: { label: "Research", tone: "info" },
  template: { label: "Template", tone: "primary" },
  report: { label: "Report", tone: "success" },
  other: { label: "Other", tone: "info" }
} as const satisfies Record<DocumentCategory, { label: string; tone: CategoryTone }>;

export const fileKindMeta = {
  pdf: { label: "PDF", Icon: PictureAsPdfRounded },
  word: { label: "Word", Icon: DescriptionRounded },
  text: { label: "Text", Icon: ArticleRounded },
  spreadsheet: { label: "CSV", Icon: TableChartRounded },
  image: { label: "Image", Icon: ImageRounded },
  file: { label: "File", Icon: InsertDriveFileRounded }
} as const;

export type FileKind = keyof typeof fileKindMeta;

export const extractionLabel = {
  ready: "Searchable",
  pending: "Indexing soon",
  processing: "Indexing…",
  failed: "Text could not be read",
  skipped: "Not indexed"
} as const satisfies Record<ExtractionStatus, string>;

export const linkRelationLabel = {
  reference: "Reference",
  sent: "Sent",
  received: "Received"
} as const satisfies Record<DocumentLinkRelation, string>;

export const linkTargetMeta = {
  person: { label: "Person", Icon: PersonRounded },
  organization: { label: "Organization", Icon: BusinessRounded },
  prospect: { label: "Prospect", Icon: TrackChangesRounded },
  route: { label: "Route", Icon: AltRouteRounded },
  campaign: { label: "Campaign", Icon: CampaignRounded }
} as const satisfies Record<DocumentLinkTargetType, { label: string; Icon: typeof PersonRounded }>;

const wordMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function getFileKind(mimeType: string | null): FileKind {
  if (mimeType === null) return "file";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === wordMimeType) return "word";
  if (mimeType === "text/plain" || mimeType === "text/markdown") return "text";
  if (mimeType === "text/csv") return "spreadsheet";
  if (mimeType.startsWith("image/")) return "image";
  return "file";
}

const byteUnits = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < byteUnits.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${byteUnits[unitIndex]}`;
}

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function formatDate(isoTimestamp: string): string {
  return dateFormatter.format(new Date(isoTimestamp));
}
