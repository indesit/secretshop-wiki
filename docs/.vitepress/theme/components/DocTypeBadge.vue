<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  type: 'policy' | 'regulation' | 'sop' | 'instruction' | 'checklist' | 'incident' | string
}>(), {
  type: 'regulation',
})

const labelMap: Record<string, string> = {
  policy: 'Policy',
  regulation: 'Regulation',
  sop: 'SOP',
  instruction: 'Instruction',
  checklist: 'Checklist',
  incident: 'Incident',
}

const normalized = computed(() => String(props.type).toLowerCase())
const label = computed(() => labelMap[normalized.value] || props.type)
</script>

<template>
  <span class="wiki-badge wiki-badge--type" :class="`wiki-badge--${normalized}`">
    {{ label }}
  </span>
</template>
