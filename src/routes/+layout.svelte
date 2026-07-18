<script lang="ts">
  import "$css/main.css";
  import favicon from "$lib/assets/favicon.svg";
  import Footer from "$components/layout/Footer.svelte";
  import { page } from "$app/state";

  let { children, data } = $props();

  const ogTitle = "Vryne — renewable energy grid idle game";
  const ogDescription =
    "A cozy idle game about running your own renewable energy grid — powered " +
    "by real weather and real electricity prices. Sell smart, upgrade your " +
    "buildings and climb the leaderboard.";
  const ogImage = $derived(`${page.url.origin}/og.png`);
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <meta name="description" content={ogDescription} />
  <meta property="og:site_name" content="Vryne" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={ogTitle} />
  <meta property="og:description" content={ogDescription} />
  <meta property="og:url" content={page.url.href} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={ogTitle} />
  <meta name="twitter:description" content={ogDescription} />
  <meta name="twitter:image" content={ogImage} />
</svelte:head>

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
