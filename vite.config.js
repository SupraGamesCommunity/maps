import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = command === 'build';

  return {
    base: isProduction ? '/supramaps/' : '/',
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    build: {
      rollupOptions: {
        input: {
          main: './index.html',
        },
      },
    },
  };
})
