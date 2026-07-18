<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  type Modifiers = "block" | "circle";

  type TooltipPosition = "top" | "bottom" | "left" | "right";

  type Props = {
    // Replace these types with string or your project's color/size types if available
    color?: string | "";
    size?: string | "";
    modifier?: Modifiers;
    children?: Snippet;
    onclick?: (event?: MouseEvent) => void;
    loading?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    class?: string;
    href?: string;
    target?: "_blank" | "_self" | "_parent" | "_top";
    arrowLeft?: boolean;
    arrowRight?: boolean;
    icon?: string;
    iconLeft?: Snippet;
    iconRightSnippet?: Snippet;
    iconRight?: boolean;
    type?: "button" | "submit" | "reset";
    formaction?: string;
    block?: boolean | "responsive";
    tooltip?: string;
    tooltipPosition?: TooltipPosition;
    responsive?: boolean;
    preloadData?: boolean;
  };

  let {
    color = "",
    size = "",
    modifier,
    children,
    onclick,
    loading = false,
    disabled = false,
    class: className,
    href,
    target,
    arrowLeft = false,
    arrowRight = false,
    icon,
    iconLeft,
    iconRightSnippet,
    iconRight = false,
    type = "submit",
    formaction,
    block,
    tooltip,
    ariaLabel = "button",
    tooltipPosition = "top",
    responsive = false,
    preloadData = true,
  }: Props = $props();

  const tooltipPositionMap: Record<TooltipPosition, string> = {
    top: "tooltip-top",
    bottom: "tooltip-bottom",
    left: "tooltip-left",
    right: "tooltip-right",
  };

  const modifierMap: Record<Modifiers, string> = {
    block: "btn-block",
    circle: "btn-circle",
  };

  const variantMap: Partial<Record<string, string>> = {
    neutral: "btn-neutral",
    primary: "btn-primary",
    secondary: "btn-secondary",
    error: "btn-error",
    ghost: "btn-ghost",
    link: "btn-link",
    outline: "btn-outline",
  };

  const sizeMap: Partial<Record<string, string>> = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
  };

  const blockClass = $derived(
    block === true
      ? "btn-block"
      : block === "responsive"
        ? "max-sm:btn-block"
        : "",
  );

  const responsiveClass = $derived(responsive ? "max-sm:btn-circle" : "");
</script>

{#snippet button()}
  <svelte:element
    this={href ? "a" : "button"}
    aria-label={ariaLabel}
    role={href ? "link" : "button"}
    tabindex="0"
    type={href ? undefined : type}
    formaction={href ? undefined : formaction}
    disabled={href ? undefined : disabled || loading}
    class="group not-prose btn antialiased
      {color && variantMap[color]} 
      {size && sizeMap[size]} 
      {modifier && modifierMap[modifier]}
      {tooltip && 'tooltip'}
      {tooltipPositionMap[tooltipPosition]}
      {blockClass}
      {responsiveClass}
      {className}"
    {href}
    {target}
    rel={target === "_blank" ? "noopener noreferrer" : undefined}
    {onclick}
    data-tip={tooltip}
    data-sveltekit-preload-data={href && preloadData ? "hover" : undefined}
  >
    {#if arrowLeft}
      <span
        class="inline-flex transition-transform duration-200 group-hover:-translate-x-0.5"
      >
        <Icon name="ArrowLeft01Icon" size={16} strokeWidth={2} />
      </span>
    {:else if iconLeft}
      {@render iconLeft?.()}
    {:else if icon && !iconRight}
      <Icon name={icon} size={size === "sm" ? 14 : 16} strokeWidth={2} />
    {/if}

    {#if children}
      <span class={responsive ? "max-sm:hidden" : "shrink-0"}
        >{@render children?.()}</span
      >
    {/if}

    {#if loading}
      <span class="animate-fade-in loading loading-xs loading-spinner"></span>
    {:else if iconRightSnippet}
      {@render iconRightSnippet?.()}
    {:else if icon && iconRight}
      <Icon name={icon} size={size === "sm" ? 14 : 16} strokeWidth={2} />
    {:else if arrowRight}
      <span
        class="inline-flex transition-transform duration-200 group-hover:translate-x-0.5"
      >
        <Icon name="ArrowRight01Icon" size={16} strokeWidth={2} />
      </span>
    {/if}
  </svelte:element>
{/snippet}

{@render button()}
