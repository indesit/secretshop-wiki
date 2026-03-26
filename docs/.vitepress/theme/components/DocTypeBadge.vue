<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  type: 'policy' | 'regulation' | 'sop' | 'instruction' | 'checklist' | 'incident' | string
}>(), {
  type: 'regulation',
})

const labelMap: Record<string, string> = {
  policy: 'Політика',
  regulation: 'Регламент',
  sop: 'SOP',
  instruction: 'Інструкція',
  checklist: 'Чекліст',
  incident: 'Інцидент',
}

const normalized = computed(() => String(props.type).toLowerCase())
const label = computed(() => labelMap[normalized.value] || props.type)
</script>

<template>
  <span class="wiki-badge wiki-badge--type" :class="`wiki-badge--${normalized}`">
    {{ label }}
  </span>
</template>
