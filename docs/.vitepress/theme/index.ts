import DefaultTheme from 'vitepress/theme'
import './custom.css'
import AISearch from './components/AISearch.vue'
import { h, nextTick } from 'vue'
import mediumZoom from 'medium-zoom'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'

type EnhanceAppContext = {
  app: any
  router?: {
    onAfterRouteChanged?: (fn: () => void) => void
  }
}

const applyMediumZoom = () => {
  if (typeof window === 'undefined') return

  nextTick(() => {
    mediumZoom('.vp-doc img', {
      margin: 24,
      background: 'rgba(15, 23, 42, 0.82)',
      scrollOffset: 80,
    })
  })
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(AISearch)
    })
  },
  enhanceApp({ app, router }: EnhanceAppContext) {
    app.component('AISearch', AISearch)
    enhanceAppWithTabs(app)

    if (typeof window !== 'undefined') {
      applyMediumZoom()
      router?.onAfterRouteChanged?.(() => applyMediumZoom())
    }
  }
}
