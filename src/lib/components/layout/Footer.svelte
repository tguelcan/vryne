<script lang="ts">
  const year = new Date().getFullYear();
</script>

<footer
  class="border-base-300 text-muted mt-8 flex items-baseline justify-between gap-4 border-t pt-3 text-xs"
>
  <span>© {year} VRYNE</span>
  <nav class="flex flex-wrap justify-end gap-x-4 gap-y-1">
    <a class="hover:underline" href="/leaderboard">leaderboard</a>
    <a class="hover:underline" href="/privacy">privacy</a>
    <a class="hover:underline" href="/terms">terms</a>
    <a class="hover:underline" href="/legal">legal notice</a>
  </nav>
</footer>
