import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs'
import Icons from 'unplugin-icons/vite'
import sidebar from './generated-sidebar.json'

export default withMermaid(defineConfig({
  title: 'Secret Shop Wiki',
  description: 'Корпоративна база знань',
  lang: 'uk-UA',
  srcDir: '.',
  outDir: '../dist',

  head: [
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
  ],

  vite: {
    server: {
      allowedHosts: ['wiki.secretshop.ua'],
    },
    plugins: [
      Icons({
        compiler: 'vue3',
      }),
    ],
  },

  themeConfig: {
    logo: '/img/secretshop-logo.jpg',
    siteTitle: 'Secret Shop Wiki',

    nav: [
      { text: 'Компанія', link: '/company/' },
      { text: 'Магазини', link: '/stores/' },
      { text: 'Товар', link: '/product/' },
      { text: 'Повернення', link: '/returns-and-warranty/' },
      { text: 'Продажі', link: '/sales/' },
      { text: 'Каса', link: '/cash/' },
      { text: 'HR', link: '/hr/' },
      { text: 'Шаблони', link: '/templates/' },
    ],

    sidebar,

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/indesit/secretshop-wiki/edit/main/docs/:path',
      text: 'Редагувати цю сторінку',
    },

    lastUpdated: {
      text: 'Оновлено',
    },

    footer: {
      message: 'Лише затверджені документи є офіційними.',
      copyright: `© ${new Date().getFullYear()} Secret Shop Wiki. Усі права захищені.`,
    },

    docFooter: {
      prev: 'Попередня',
      next: 'Наступна',
    },
  },

  markdown: {
    lineNumbers: true,
    config(md) {
      md.use(tabsMarkdownPlugin)
    },
  },
}))
