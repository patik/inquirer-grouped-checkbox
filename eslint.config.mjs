// @ts-check

import pluginJs from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'

export default defineConfig([
    globalIgnores(['node_modules/**', 'dist/**', '.claude/**']),
    pluginJs.configs.recommended,
    tseslint.configs.recommended,
    eslintPluginPrettier,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    caughtErrors: 'none',
                },
            ],
        },
    },
])
