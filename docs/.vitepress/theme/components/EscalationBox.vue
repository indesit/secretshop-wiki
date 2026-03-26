<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  level?: 'info' | 'warning' | 'critical' | string
}>(), {
  title: 'Ескалація',
  level: 'warning',
})
</script>

<template>
  <div class="wiki-escalation" :class="`wiki-escalation--${level}`">
    <div class="wiki-escalation__title">{{ title }}</div>
    <div class="wiki-escalation__content">
      <slot />
    </div>
  </div>
</template>
