<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import docsMeta from '../../generated-docs-meta.json'

const { frontmatter } = useData()

const items = computed(() => {
  const related = frontmatter.value?.related_documents
  if (!Array.isArray(related)) return []

  return related.map((link: string) => {
    const meta = (docsMeta as Record<string, { title?: string; type?: string; icon?: string }>)[link] || {}
    return {
      link,
      title: meta.title || link,
      type: meta.type || '',
      icon: meta.icon || '📄',
    }
  })
})
</script>

<template>
  <div v-if="items.length" class="wiki-related-docs">
    <div class="wiki-related-docs__title">Пов'язані документи</div>
    <div class="wiki-related-docs__list">
      <a
        v-for="item in items"
        :key="item.link"
        class="wiki-related-docs__card"
        :href="item.link"
      >
        <div class="wiki-related-docs__icon">{{ item.icon }}</div>
        <div class="wiki-related-docs__body">
          <div class="wiki-related-docs__name">{{ item.title }}</div>
          <div v-if="item.type" class="wiki-related-docs__type">{{ item.type }}</div>
        </div>
      </a>
    </div>
  </div>
</template>
