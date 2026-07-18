import { z } from "zod";
import config from "./config.json";

const ThemeSchema = z.object({
  name: z.string(),
  colors: z.record(
    z.string(),
    // valid oklch(), hex, rgb, hsl –– but not named colors like "red" or "blue"
    z.string().regex(/^(oklch|rgb|hsl|#)/),
  ),
  radius: z.record(z.string(), z.string()),
  size: z.record(z.string(), z.string()),
  border: z.string().default("1px"),
  depth: z.string().default("1"),
  noise: z.string().default("1"),
});

export type Theme = z.infer<typeof ThemeSchema>;

export function loadTheme(): Theme {
  return ThemeSchema.parse(config.theme);
}

export const themeToCssVars = (theme: Theme) =>
  [
    ...Object.entries(theme.colors).map(([k, v]) => `--color-${k}: ${v}`),
    ...Object.entries(theme.radius).map(([k, v]) => `--radius-${k}: ${v}`),
    ...Object.entries(theme.size).map(([k, v]) => `--size-${k}: ${v}`),
    `--border: ${theme.border}`,
    `--depth: ${theme.depth}`,
    `--noise: ${theme.noise}`,
  ]
    .join(";")
    .concat(";");
