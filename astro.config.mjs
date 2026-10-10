import { defineConfig } from "astro/config";

// Served from the user site's custom domain at shubhamtatvamasi.com/jobs/.
export default defineConfig({
  site: "https://shubhamtatvamasi.com",
  base: "/jobs",
  trailingSlash: "ignore",
});
