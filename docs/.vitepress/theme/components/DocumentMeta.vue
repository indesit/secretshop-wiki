<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  type?: string
  status?: string
  owner?: string
  reviewCycleDays?: string | number
  effectiveFrom?: string
  lastReviewed?: string
}>(), {
  type: 'regulation',
  status: 'draft',
  owner: '—',
  reviewCycleDays: '—',
  effectiveFrom: '—',
  lastReviewed: '—',
})

const reviewCycle = computed(() => props.reviewCycleDays === undefined || props.reviewCycleDays === null || props.reviewCycleDays === '' ? '—' : String(props.reviewCycleDays))
</script>

<template>
  <div class="wiki-docmeta">
    <div class="wiki-docmeta__badges">
      <DocTypeBadge :type="type" />
      <StatusBadge :status="status" />
    </div>

    <div class="wiki-docmeta__grid">
      <div class="wiki-docmeta__item">
        <div class="wiki-docmeta__label">Власник</div>
        <div class="wiki-docmeta__value">{{ owner }}</div>
      </div>
      <div class="wiki-docmeta__item">
        <div class="wiki-docmeta__label">Оновлення</div>
        <div class="wiki-docmeta__value">{{ reviewCycle }} днів</div>
      </div>
      <div class="wiki-docmeta__item">
        <div class="wiki-docmeta__label">Діє з</div>
        <div class="wiki-docmeta__value">{{ effectiveFrom }}</div>
      </div>
      <div class="wiki-docmeta__item">
        <div class="wiki-docmeta__label">Останній перегляд</div>
        <div class="wiki-docmeta__value">{{ lastReviewed }}</div>
      </div>
    </div>
  </div>
</template>
