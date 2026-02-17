import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Plugin to inject BASE_URL into manifest.json
function manifestPlugin(): Plugin {
  let base = '/'

  return {
    name: 'manifest-plugin',
    configResolved(config) {
      base = config.base
    },
    closeBundle() {
      // Update manifest.json after build
      const manifestPath = resolve(__dirname, 'dist/manifest.json')
      try {
        const manifestContent = readFileSync(manifestPath, 'utf-8')
        const manifest = JSON.parse(manifestContent)

        // Update URLs to include base path
        manifest.start_url = base
        manifest.icons = manifest.icons.map((icon: { src: string }) => ({
          ...icon,
          src: icon.src.startsWith('/') ? `${base}${icon.src.slice(1)}` : icon.src
        }))

        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
        console.log(`✅ Updated manifest.json with base path: ${base}`)
      } catch (error) {
        console.warn('⚠️  Could not update manifest.json:', error)
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig(() => {
  const env =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ??
    {}

  const basePath = env.BASE_PATH?.trim()

  const normalizedBase =
    basePath && basePath !== '/'
      ? `/${basePath.replace(/^\/+|\/+$/g, '')}/`
      : '/'

  return {
    base: normalizedBase,
    plugins: [react(), manifestPlugin()],
    server: {
      host: '0.0.0.0',
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    },
    build: {
      rollupOptions: {
        output: {
          // Force single file output by not splitting manual chunks
          manualChunks: undefined,
        }
      },
      // Increase chunk size warning limit (kB) for single-bundle output
      chunkSizeWarningLimit: 4096,
      // Copy public directory assets
      copyPublicDir: true
    }
  }
})
