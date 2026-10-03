import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { outreachTheme } from "@/shared/ui/theme";

/** The theme and a fresh query client that never retries, so a failing request shows up immediately. */
export function renderWithApp(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<ThemeProvider theme={outreachTheme}><QueryClientProvider client={client}>{ui}</QueryClientProvider></ThemeProvider>);
}
