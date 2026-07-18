<script lang="ts">
  import "$css/main.css";
  import favicon from "$lib/assets/favicon.svg";
  import Footer from "$components/layout/Footer.svelte";

  let { children, data } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- Shared shell: identical header and footer on game and content pages. -->
<div class="mx-auto flex min-h-screen max-w-3xl flex-col p-4">
  <header class="mb-4 flex items-baseline justify-between">
    <a href="/" class="text-xl tracking-widest">VRYNE</a>
    {#if !data.user}
      <a href="/login" class="text-xs hover:underline">sign in</a>
    {/if}
  </header>

  <div class="flex flex-1 flex-col">
    {@render children()}
  </div>

  <Footer />
</div>
