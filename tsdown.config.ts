import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    // Match the extensions the published `exports` map already points at:
    // `.js` for ESM (the package is type: module) and `.cjs` for CJS.
    fixedExtension: false,
    dts: true,
    clean: true,
    sourcemap: true,
})
