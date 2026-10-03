import AssessmentRounded from "@mui/icons-material/AssessmentRounded";
import BusinessCenterRounded from "@mui/icons-material/BusinessCenterRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import FolderRounded from "@mui/icons-material/FolderRounded";
import HubRounded from "@mui/icons-material/HubRounded";
import PeopleAltRounded from "@mui/icons-material/PeopleAltRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import type { ReactNode } from "react";

export type NavigationItem = Readonly<{ label: string; icon: ReactNode; href?: string }>;
export const navigationItems: readonly NavigationItem[] = [
  { label: "Overview", icon: <DashboardRounded />, href: "/" },
  { label: "People & companies", icon: <PeopleAltRounded />, href: "/people" },
  { label: "Outreach", icon: <BusinessCenterRounded />, href: "/outreach" },
  { label: "Routes & campaigns", icon: <HubRounded />, href: "/routes" },
  { label: "Analytics", icon: <AssessmentRounded />, href: "/analytics" },
  { label: "Library", icon: <FolderRounded />, href: "/library" },
  { label: "Settings & security", icon: <SettingsRounded /> }
];
export function isActiveRoute(pathname: string, href: string | undefined): boolean {
  if (href === undefined) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
