export default defineNuxtConfig({
  compatibilityDate: '2026-11-11',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },
  app: {
    head: {
      title: 'Systems Atlas — Follow the request',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'An interactive field guide to system design. Learn by following the request.' },
        { name: 'theme-color', content: '#f6f7f2' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
