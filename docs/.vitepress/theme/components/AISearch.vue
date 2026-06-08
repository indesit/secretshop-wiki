<script setup>
import { ref } from 'vue'

const query = ref('')
const answer = ref('')
const sources = ref([])
const loading = ref(false)
const showResult = ref(false)

async function askAI() {
  if (!query.value.trim()) return
  
  loading.value = true
  showResult.value = true
  answer.value = ''
  sources.value = []

  try {
    const response = await fetch('http://' + window.location.hostname + ':3001/api/ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query.value })
    })
    const data = await response.json()
    answer.value = data.answer
    sources.value = data.sources
  } catch (err) {
    answer.value = 'Помилка зв\'язку з ШІ-сервером.'
  } finally {
    loading.value = false
  }
}

function close() {
  showResult.value = false
  query.value = ''
}
</script>

<template>
  <div class="ai-search-container">
    <div class="search-input-wrapper">
      <input 
        v-model="query" 
        type="text" 
        placeholder="Питання до ШІ (напр. 'як зробити повернення?')"
        @keyup.enter="askAI"
      />
      <button @click="askAI" :disabled="loading" class="ai-btn">
        <span v-if="!loading">AI 🪄</span>
        <span v-else class="pulse">...</span>
      </button>
    </div>

    <Transition name="fade">
      <div v-if="showResult" class="ai-result-overlay" @click.self="close">
        <div class="ai-result-card glass">
          <div class="card-header">
            <h3>Швидка відповідь від AI</h3>
            <button @click="close" class="close-btn">&times;</button>
          </div>
          
          <div class="card-body">
            <div v-if="loading" class="loading-state">
              <div class="skeleton"></div>
              <div class="skeleton sm"></div>
            </div>
            <div v-else>
              <p class="answer-text">{{ answer }}</p>
              <div v-if="sources.length" class="sources">
                <small>Джерела:</small>
                <ul>
                  <li v-for="s in sources" :key="s">
                    <a :href="'/' + s.replace('.md', '.html')">{{ s.split('/').pop() }}</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="card-footer">
            <small>Згенеровано локальною моделлю Llama 3.1. Перевіряйте офіційні інструкції.</small>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ai-search-container {
  display: flex;
  align-items: center;
  margin-left: 1rem;
  position: relative;
}

.search-input-wrapper {
  display: flex;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  padding: 2px 4px;
  width: 280px;
  transition: all 0.3s ease;
}

.search-input-wrapper:focus-within {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 10px rgba(100, 108, 255, 0.2);
}

input {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  padding: 6px 12px;
  width: 100%;
  color: var(--vp-c-text-1);
}

input:focus {
  outline: none;
}

.ai-btn {
  background: linear-gradient(135deg, #646cff 0%, #a855f7 100%);
  color: white;
  border: none;
  border-radius: 16px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  margin-left: 4px;
  white-space: nowrap;
}

.pulse {
  display: inline-block;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.5; }
  to { opacity: 1; transform: scale(1.1); }
}

.ai-result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.glass {
  background: rgba(255, 255, 255, 0.85); /* fallback */
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.dark .glass {
  background: rgba(30, 30, 30, 0.85);
  border-color: rgba(255,255,255,0.1);
}

.ai-result-card {
  width: 90%;
  max-width: 500px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  background: linear-gradient(to right, #646cff, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--vp-c-text-2);
}

.card-body {
  padding: 20px;
}

.answer-text {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.sources {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--vp-c-divider);
}

.sources ul {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sources a {
  background: var(--vp-c-brand-soft);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  text-decoration: none;
  color: var(--vp-c-brand);
}

.card-footer {
  padding: 12px 20px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
  text-align: center;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.skeleton {
  height: 1rem;
  background: var(--vp-c-divider);
  border-radius: 4px;
  margin-bottom: 10px;
  animation: shimmer 2s infinite linear;
}

.skeleton.sm { width: 60%; }

@keyframes shimmer {
  0% { opacity: 0.3; }
  50% { opacity: 0.6; }
  100% { opacity: 0.3; }
}

@media (max-width: 768px) {
  .search-input-wrapper { width: 100%; }
}
</style>
