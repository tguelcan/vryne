<script lang="ts">
  import Icon from "$components/elements/Icon.svelte";

  const year = new Date().getFullYear();
</script>

<footer
  class="border-base-300 text-base-content/50 mt-8 flex items-baseline justify-between gap-4 border-t pt-3 text-xs"
>
  <span>© {year} VRYNE</span>
  <nav class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
    <a class="hover:underline" href="/guide">how to play</a>
    <a class="hover:underline" href="/leaderboard">leaderboard</a>
    <a class="hover:underline" href="/privacy">privacy</a>
    <a class="hover:underline" href="/terms">terms</a>
    <a class="hover:underline" href="/legal">legal notice</a>
    <a
      class="hover:text-base-content inline-flex"
      href="https://github.com/tguelcan/vryne"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Vryne on GitHub"
    >
      <Icon name="GithubIcon" size={14} />
    </a>
  </nav>
</footer>
