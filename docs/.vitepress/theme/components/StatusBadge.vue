<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  status: 'draft' | 'approved' | 'archived' | 'review' | string
}>(), {
  status: 'draft',
})

const labelMap: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  archived: 'Archived',
  review: 'Review',
}

const normalized = computed(() => String(props.status).toLowerCase())
const label = computed(() => labelMap[normalized.value] || props.status)
</script>

<template>
  <span class="wiki-badge wiki-badge--status" :class="`wiki-badge--${normalized}`">
    {{ label }}
  </span>
</template>
