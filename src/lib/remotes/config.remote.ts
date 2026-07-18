import { query } from "$app/server";
import config from "$server/config.json";
export const getConfig = query(async () => {
  return config?.app;
});
