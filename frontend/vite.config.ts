import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
  },
  build: {
    rollupOptions: {
      external: ['@zama-fhe/relayer-sdk', '@zama-fhe/relayer-sdk/bundle'],
    },
  },
  resolve: {
    alias: {
      '@zama-fhe/relayer-sdk/bundle': path.resolve(
        __dirname,
        'src/stubs/fhevm-stub.ts'
      ),
    },
  },
  define: {
    global: 'globalThis',
  },
})
