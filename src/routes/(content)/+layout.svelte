<script lang="ts">
  // Content pages (markdown): same shared header/footer via the root layout,
  // plus prose typography for the rendered markdown.
  let { children } = $props();
</script>

<main class="prose prose-sm max-w-none py-4">
  {@render children()}
</main>
