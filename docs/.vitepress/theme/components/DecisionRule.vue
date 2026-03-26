<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  verdict?: string
  tone?: 'info' | 'warning' | 'success' | string
}>(), {
  title: 'Правило рішення',
  verdict: '',
  tone: 'info',
})
</script>

<template>
  <div class="wiki-decision" :class="`wiki-decision--${tone}`">
    <div class="wiki-decision__header">
      <div class="wiki-decision__title">{{ title }}</div>
      <div v-if="verdict" class="wiki-decision__verdict">{{ verdict }}</div>
    </div>
    <div class="wiki-decision__content">
      <slot />
    </div>
  </div>
</template>
