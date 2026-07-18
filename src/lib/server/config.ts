import { z } from "zod";
import config from "./config.json";

const AppSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
});

export type AppConfig = z.infer<typeof AppSchema>;

export function loadApp(): AppConfig {
  return AppSchema.parse(config.app);
}
