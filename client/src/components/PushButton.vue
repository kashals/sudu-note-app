<script setup lang="ts">
// pushable button component — flat style, push physics on hover/click
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}>();

defineEmits<{ (e: 'click'): void }>();
</script>

<template>
  <button
    class="pushable"
    :class="[variant ?? 'primary', { 'is-disabled': disabled }]"
    :type="type ?? 'button'"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.pushable {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  position: relative;
  border: none;
  border-radius: 6px;
  padding: 9px 20px;
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: white;
  cursor: pointer;
  white-space: nowrap;
  outline-offset: 4px;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  user-select: none;

  /* resting state — slightly raised */
  transform: translateY(-2px);
  transition:
    transform 600ms cubic-bezier(0.3, 0.7, 0.4, 1),
    filter 250ms,
    box-shadow 600ms cubic-bezier(0.3, 0.7, 0.4, 1);
}

/* ─── primary (sudu green) ─── */
.primary {
  background: hsl(161, 84%, 39%);
  box-shadow: 0 4px 0 hsl(161, 84%, 22%);
}

/* ─── danger (red) ─── */
.danger {
  background: hsl(0, 72%, 48%);
  box-shadow: 0 4px 0 hsl(0, 72%, 28%);
}

/* ─── secondary (neutral raised surface) ─── */
.secondary {
  background: var(--bg-surface);
  border: 1.5px solid var(--border);
  color: var(--text-primary);
  box-shadow: 0 4px 0 var(--border);
}

/* ─── warning (amber/orange) ─── */
.warning {
  background: hsl(35, 92%, 48%);
  box-shadow: 0 4px 0 hsl(35, 92%, 28%);
}

/* ─── hover: lift higher ─── */
.pushable:hover {
  filter: brightness(108%);
  transform: translateY(-4px);
  transition:
    transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5),
    filter 250ms,
    box-shadow 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5);
}

.primary:hover  { box-shadow: 0 6px 0 hsl(161, 84%, 22%); }
.danger:hover   { box-shadow: 0 6px 0 hsl(0, 72%, 28%); }
.warning:hover  { box-shadow: 0 6px 0 hsl(35, 92%, 28%); }

/* ─── active: press down ─── */
.pushable:active {
  transform: translateY(0px);
  filter: brightness(100%);
  transition:
    transform 34ms,
    box-shadow 34ms;
}

.primary:active { box-shadow: 0 1px 0 hsl(161, 84%, 22%); }
.danger:active  { box-shadow: 0 1px 0 hsl(0, 72%, 28%); }
.warning:active { box-shadow: 0 1px 0 hsl(35, 92%, 28%); }

/* ─── focus ─── */
.pushable:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 4px;
}

.pushable:focus:not(:focus-visible) {
  outline: none;
}

/* ─── disabled ─── */
.pushable.is-disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: translateY(-2px);
  filter: none;
}

.pushable.is-disabled:hover {
  transform: translateY(-2px);
  filter: none;
}

.primary.is-disabled { box-shadow: 0 4px 0 hsl(161, 84%, 22%); }
.danger.is-disabled  { box-shadow: 0 4px 0 hsl(0, 72%, 28%); }
.warning.is-disabled { box-shadow: 0 4px 0 hsl(35, 92%, 28%); }
</style>
