import { mdsvex } from "mdsvex";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import adapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
        experimental: { async: true },
      },
      adapter: adapter(),
      preprocess: [mdsvex({ extensions: [".svx", ".md"] })],
      extensions: [".svelte", ".svx", ".md"],
      experimental: { remoteFunctions: true, handleRenderingErrors: true },
      alias: {
        $css: "src/lib/css/*",
        $components: "src/lib/components/*",
        $assets: "src/lib/assets/*",
        $server: "src/lib/server/*",
        $remotes: "src/lib/remotes/*",
        $generated: "src/generated/*",
      },
    }),
  ],
  test: {
    expect: { requireAssertions: true },
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
