<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
}>(), {
  subtitle: '',
})
</script>

<template>
  <div class="wiki-rolecard">
    <div class="wiki-rolecard__title">{{ title }}</div>
    <div v-if="subtitle" class="wiki-rolecard__subtitle">{{ subtitle }}</div>
    <div class="wiki-rolecard__content">
      <slot />
    </div>
  </div>
</template>
