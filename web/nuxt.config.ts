import tailwindcss from '@tailwindcss/vite'

// BrickMaze TD is a client-only game: no SSR, so `nuxt generate` gives a static
// bundle that Coolify can serve as plain files.
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  telemetry: false,
  css: ['~/assets/css/main.css'],
  // Keep the atomic-design folders (atoms/molecules/...) out of component names.
  components: [{ path: '~/components', pathPrefix: false }],
  typescript: {
    tsConfig: {
      compilerOptions: {
        // The game code ported from the React prototype indexes grids and arrays freely.
        // Turn this back on once those modules are tightened up.
        noUncheckedIndexedAccess: false,
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en', class: 'dark' },
      title: 'BrickMaze TD — Pixel-Art Mazing Tower Defense',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        {
          name: 'description',
          content:
            'A tactile pixel-art mazing tower defense game. Draft 4 colored bricks per turn, sculpt multi-checkpoint mazes, fuse color synergies, and freely relocate turrets between waves.',
        },
      ],
      bodyAttrs: {
        class: 'bg-[#161B22] text-[#F1F5F9] antialiased selection:bg-amber-500/30 selection:text-amber-100',
      },
      script: [
        {
          src: 'https://cloud.umami.is/script.js',
          'data-website-id': '1063d8c8-022b-416d-a291-57deacbcd52f',
          // Only count the live site, not localhost or Netlify deploy previews.
          'data-domains': 'some-td.netlify.app',
          defer: true,
        },
      ],
    },
  },
})
