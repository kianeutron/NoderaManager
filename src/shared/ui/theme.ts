import { alpha, createTheme } from "@mui/material/styles";

export const themeNames = ["midnight", "aurora", "verdant", "ember", "tide", "noir", "chrome"] as const;
export type ThemeName = (typeof themeNames)[number];

export function isThemeName(value: string | null | undefined): value is ThemeName {
  return typeof value === "string" && (themeNames as readonly string[]).includes(value);
}

type ThemeDefinition = Readonly<{
  label: string;
  description: string;
  swatch: readonly [string, string, string];
  background: string;
  panel: string;
  border: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  text: string;
  muted: string;
  topography: readonly [string, string, string];
}>;

export const themeDefinitions: Record<ThemeName, ThemeDefinition> = {
  midnight: { label: "Midnight Azure", description: "Focused and electric", swatch: ["#06102B", "#2D8CFF", "#906EFF"], background: "#06102B", panel: "#0B1A3B", border: "#243B68", primary: "#2D8CFF", primaryLight: "#73B7FF", primaryDark: "#0068DF", secondary: "#906EFF", success: "#35D6A4", warning: "#F9B44B", error: "#FF6B8A", text: "#F7FAFF", muted: "#93A6CC", topography: ["#0B2D5C", "#2478A8", "#65B9D0"] },
  aurora: { label: "Aurora Violet", description: "Soft neon and creative", swatch: ["#160C2B", "#B56CFF", "#FF7EB6"], background: "#160C2B", panel: "#241342", border: "#56337D", primary: "#B56CFF", primaryLight: "#D6AEFF", primaryDark: "#813BE0", secondary: "#FF7EB6", success: "#5FE0C0", warning: "#FFC56B", error: "#FF7895", text: "#FCF8FF", muted: "#C1A9D8", topography: ["#32134E", "#8A4FAD", "#E47BB5"] },
  verdant: { label: "Verdant Signal", description: "Calm, sharp and alive", swatch: ["#071E20", "#2DD4A7", "#A6E45A"], background: "#071E20", panel: "#0D2B2B", border: "#245352", primary: "#2DD4A7", primaryLight: "#7BE6C8", primaryDark: "#0E9E7B", secondary: "#A6E45A", success: "#63E6BE", warning: "#F4C95D", error: "#FF8B7B", text: "#F4FFFC", muted: "#9FC5BF", topography: ["#0C3B3B", "#1E8A7E", "#A6D968"] },
  ember: { label: "Ember Glow", description: "Warm, cinematic and bold", swatch: ["#1B0D0A", "#FF815B", "#FFD166"], background: "#1B0D0A", panel: "#2B1515", border: "#6B3329", primary: "#FF815B", primaryLight: "#FFB08F", primaryDark: "#D85A34", secondary: "#FFD166", success: "#63D6A3", warning: "#FFC857", error: "#FF6B6B", text: "#FFF8F3", muted: "#D7A99A", topography: ["#542018", "#B84E32", "#FFB45E"] },
  tide: { label: "Tidal Glass", description: "Cool, lucid and spacious", swatch: ["#061A24", "#27D7E7", "#6EA8FF"], background: "#061A24", panel: "#0B2936", border: "#1D5967", primary: "#27D7E7", primaryLight: "#86F4F4", primaryDark: "#0EA6B7", secondary: "#6EA8FF", success: "#63E6BE", warning: "#F5C86A", error: "#FF8298", text: "#F2FEFF", muted: "#91C3CC", topography: ["#0C3B4B", "#1D8B9A", "#68D9E1"] },
  noir: { label: "Noir Orchid", description: "Dramatic, polished and expressive", swatch: ["#130A1B", "#E55CFF", "#FF7B9C"], background: "#130A1B", panel: "#24102E", border: "#633B78", primary: "#E55CFF", primaryLight: "#F5A6FF", primaryDark: "#B52BD1", secondary: "#FF7B9C", success: "#65D6B3", warning: "#FFD074", error: "#FF708F", text: "#FFF6FF", muted: "#C9A9D2", topography: ["#3B174A", "#8B3E9C", "#E978C0"] },
  chrome: { label: "Liquid Chrome", description: "Polished, silver and precise", swatch: ["#111315", "#D7DADF", "#FFFFFF"], background: "#111315", panel: "#1D2024", border: "#60656B", primary: "#C8CDD2", primaryLight: "#FFFFFF", primaryDark: "#858B91", secondary: "#E4E7EA", success: "#7AD9B4", warning: "#E7C477", error: "#F1848D", text: "#FAFBFC", muted: "#AEB4BA", topography: ["#262B30", "#656C73", "#D4D9DE"] }
};

export function createOutreachTheme(name: ThemeName) {
  const definition = themeDefinitions[name];
  return createTheme({
    cssVariables: true,
    palette: {
      mode: "dark",
      background: { default: definition.background, paper: definition.panel },
      primary: { main: definition.primary, light: definition.primaryLight, dark: definition.primaryDark, contrastText: name === "chrome" ? definition.background : "#FFFFFF" },
      secondary: { main: definition.secondary },
      success: { main: definition.success }, warning: { main: definition.warning }, error: { main: definition.error },
      text: { primary: definition.text, secondary: definition.muted, disabled: alpha(definition.muted, 0.64) },
      divider: alpha(definition.border, 0.9)
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h4: { fontWeight: 700, letterSpacing: "-0.03em" }, h5: { fontWeight: 700, letterSpacing: "-0.025em" }, h6: { fontWeight: 700 }, subtitle2: { fontWeight: 700 }, button: { fontWeight: 700, textTransform: "none" }
    },
    components: {
      MuiCssBaseline: { styleOverrides: { body: { background: `radial-gradient(circle at 82% -20%, ${alpha(definition.primary, 0.18)}, transparent 27%), ${definition.background}`, color: definition.text } } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { contained: name === "chrome" ? { color: definition.background, "&:hover": { backgroundColor: definition.primaryLight, color: definition.background } } : {} } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8 } } }
    }
  });
}

export const outreachTheme = createOutreachTheme("midnight");
