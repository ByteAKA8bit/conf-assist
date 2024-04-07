import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    define: {
      __APP_ENV__: JSON.stringify(env),
    },
    main: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@main': resolve('src/main'),
          '@resources': resolve('resources'),
        },
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@preload': resolve('src/preload'),
        },
      },
    },
    renderer: {
      assetsInclude: 'src/renderer/assets/**',
      resolve: {
        alias: {
          '@': resolve('src/renderer/src'),
          '@renderer': resolve('src/renderer/src'),
          '@assets': resolve('src/renderer/src/assets'),
          '@components': resolve('src/renderer/src/components'),
          '@hooks': resolve('src/renderer/src/hooks'),
          '@pages': resolve('src/renderer/src/pages'),
          '@provider': resolve('src/renderer/src/provider'),
          '@store': resolve('src/renderer/src/store'),
          '@utils': resolve('src/renderer/src/utils'),
        },
      },
      plugins: [react()],
      css: {
        postcss: {
          plugins: [tailwindcss],
        },
      },
    },
  }
})
