import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk', 'porto'],
  },
  resolve: {
    alias: {
      '@zama-fhe/relayer-sdk/bundle': path.resolve(
        __dirname,
        'node_modules/@zama-fhe/relayer-sdk/bundle/relayer-sdk-js.js'
      ),
      'viem/experimental/erc7821': path.resolve(
        __dirname,
        'node_modules/viem/dist/esm/experimental/erc7821/index.js'
      ),
    },
  },
  define: {
    global: 'globalThis',
  },
})
