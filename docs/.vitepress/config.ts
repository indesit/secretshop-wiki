import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs'
import Icons from 'unplugin-icons/vite'

export default withMermaid(defineConfig({

  title: 'Company Wiki',
  description: 'Корпоративна база знань',
  lang: 'uk-UA',
  srcDir: '.',
  outDir: '../dist',

  head: [
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
  ],

  vite: {
    plugins: [
      Icons({
        compiler: 'vue3',
      }),
    ],
  },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Company Wiki',

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

    sidebar: {
      '/company/': [
        {
          text: 'Компанія',
          items: [
            { text: 'Огляд', link: '/company/' },
            { text: 'Місія та принципи', link: '/company/mission-and-principles' },
            { text: 'Оргструктура', link: '/company/org-structure' },
            { text: 'Ролі та відповідальність', link: '/company/roles-and-responsibilities' },
            { text: 'Матриця ескалації', link: '/company/escalation-matrix' },
          ],
        },
      ],

      '/stores/': [
        {
          text: 'Магазини',
          items: [
            { text: 'Огляд', link: '/stores/' },
            {
              text: 'Відкриття / Закриття',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/stores/opening-closing/' },
                { text: 'SOP: Відкриття та закриття магазину', link: '/stores/opening-closing/sop-opening-closing' },
              ],
            },
            {
              text: 'Стандарти обслуговування',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/stores/service-standards/' },
                { text: 'SOP: Стандарти обслуговування', link: '/stores/service-standards/sop-service-standards' },
              ],
            },
            {
              text: 'Технічні несправності',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/stores/technical-issues/' },
                { text: 'SOP: Технічний інцидент', link: '/stores/technical-issues/sop-technical-incident' },
              ],
            },
            { text: 'Технічне обслуговування', link: '/stores/maintenance/' },
            { text: 'Мерчендайзинг', link: '/stores/merchandising/' },
            { text: 'Безпека', link: '/stores/safety-security/' },
            { text: 'Нестандартні ситуації', link: '/stores/нестандартні-ситуації' },
          ],
        },
      ],

      '/product/': [
        {
          text: 'Товар',
          items: [
            { text: 'Огляд', link: '/product/' },
            { text: 'Приймання', link: '/product/receiving/' },
            {
              text: 'Переміщення',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/product/transfers/' },
                { text: 'Регламент: Переміщення між магазинами', link: '/product/transfers/reg-transfer-between-stores' },
                { text: 'SOP: LIVE-переміщення', link: '/product/transfers/sop-live-transfer' },
              ],
            },
            { text: 'Обробка браку', link: '/product/defect-handling/' },
            { text: 'Пошкодження товару', link: '/product/product-damage/' },
            { text: 'Недостача / Лишки', link: '/product/shortage-overage/' },
            { text: 'Залишки на складі', link: '/product/stock-balance/' },
            { text: 'Списання', link: '/product/writeoff/' },
            { text: 'Асортимент', link: '/product/assortment/' },
          ],
        },
      ],

      '/returns-and-warranty/': [
        {
          text: 'Повернення та гарантія',
          items: [
            { text: 'Огляд', link: '/returns-and-warranty/' },
            {
              text: 'Повернення',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/returns-and-warranty/returns/' },
                { text: 'Чекліст для продавця', link: '/returns-and-warranty/returns/checklist-seller-returns-exchange-warranty' },
                { text: 'SOP: Повернення та обмін', link: '/returns-and-warranty/returns/sop-return-exchange' },
                { text: 'Інструкція: Білизна / піжами / купальники', link: '/returns-and-warranty/returns/instruction-underwear-returns-and-exchange' },
              ],
            },
            {
              text: 'Обмін',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/returns-and-warranty/exchange/' },
                { text: 'Регламент обміну товару', link: '/returns-and-warranty/exchange/reg-exchange-rules' },
              ],
            },
            {
              text: 'Гарантія',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/returns-and-warranty/warranty/' },
                { text: 'Регламент гарантійних умов', link: '/returns-and-warranty/warranty/reg-warranty-conditions' },
                { text: 'SOP: Гарантійне обслуговування', link: '/returns-and-warranty/warranty/sop-warranty' },
              ],
            },
            {
              text: 'Експертиза',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/returns-and-warranty/expertise/' },
                { text: 'SOP: Експертиза товару', link: '/returns-and-warranty/expertise/sop-expertise' },
              ],
            },
            {
              text: 'Претензії клієнтів',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/returns-and-warranty/customer-claims/' },
                { text: 'SOP: Робота з претензіями клієнтів', link: '/returns-and-warranty/customer-claims/sop-customer-claims-handling' },
              ],
            },
          ],
        },
      ],

      '/sales/': [
        {
          text: 'Продажі',
          items: [
            { text: 'Огляд', link: '/sales/' },
            { text: 'Консультація', link: '/sales/consultation/' },
            { text: 'Заперечення', link: '/sales/objections/' },
            { text: 'Допродаж', link: '/sales/upsell/' },
            { text: 'Резерви', link: '/sales/reservations/' },
            { text: 'Замовлення', link: '/sales/orders/' },
            { text: 'Нестандартні кейси', link: '/sales/special-cases/' },
          ],
        },
      ],

      '/cash/': [
        {
          text: 'Каса',
          items: [
            { text: 'Огляд', link: '/cash/' },
            {
              text: 'Касова дисципліна',
              collapsed: false,
              items: [
                { text: 'Огляд', link: '/cash/cash-discipline/' },
                { text: 'SOP: Касова дисципліна', link: '/cash/cash-discipline/sop-cash-discipline' },
              ],
            },
            { text: 'Оплати', link: '/cash/payments/' },
            { text: 'Чеки', link: '/cash/receipts/' },
            { text: 'Закриття зміни', link: '/cash/shift-closing/' },
            { text: 'Касові інциденти', link: '/cash/cash-incidents/' },
          ],
        },
      ],

      '/hr/': [
        {
          text: 'HR',
          items: [
            { text: 'Огляд', link: '/hr/' },
            { text: 'Підбір персоналу', link: '/hr/hiring/' },
            { text: 'Адаптація', link: '/hr/onboarding/' },
            { text: 'Навчання', link: '/hr/training/' },
            { text: 'Стандарти', link: '/hr/standards/' },
            { text: 'Мотивація', link: '/hr/motivation/' },
          ],
        },
      ],

      '/templates/': [
        {
          text: 'Шаблони',
          items: [
            { text: 'Огляд', link: '/templates/' },
            { text: 'SOP', link: '/templates/sop-template' },
            { text: 'Policy', link: '/templates/policy-template' },
            { text: 'Regulation', link: '/templates/regulation-template' },
            { text: 'Checklist', link: '/templates/checklist-template' },
            { text: 'Incident', link: '/templates/incident-template' },
            { text: 'Decision Log', link: '/templates/decision-log-template' },
          ],
        },
      ],

      '/glossary/': [
        {
          text: 'Глосарій',
          items: [
            { text: 'Терміни', link: '/glossary/terms' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/your-org/company-wiki/edit/main/docs/:path',
      text: 'Редагувати цю сторінку',
    },

    lastUpdated: {
      text: 'Оновлено',
    },

    footer: {
      message: 'Лише затверджені документи є офіційними.',
      copyright: `© ${new Date().getFullYear()} Company Wiki. Усі права захищені.`,
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
