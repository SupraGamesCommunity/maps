import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = command === 'build';

  return {
    base: isProduction ? '/maps/' : '/',
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    build: {
      sourcemap: true,
      rollupOptions: {
        input: {
          main: './index.html',
        },
      },
    },
  };
})
