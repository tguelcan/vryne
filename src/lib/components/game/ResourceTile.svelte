<script lang="ts">
  // One resource tile: icon, label, animated value.
  import Icon from "$components/elements/Icon.svelte";

  type Props = { label: string; value: string; icon: string };

  let { label, value, icon }: Props = $props();
</script>

<div class="border-base-content rounded-box border p-3">
  <div class="text-muted flex items-center gap-1 text-xs">
    <Icon name={icon} size={12} />
    {label}
  </div>
  <div class="text-lg">{value}</div>
</div>
