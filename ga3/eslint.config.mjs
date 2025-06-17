import { FlatCompat } from '@eslint/eslintrc'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
})

export default [
  {
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      semi: 'off',
      'space-before-function-paren': 'off',
      'variable-name': 'off',
      'ter-indent': 'off',
      'no-console': 'warn',
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      curly: 'error',
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-parameter-properties': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/prefer-interface': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-triple-slash-reference': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-debugger': 'warn',
      'no-const-assign': 'error',
      'no-class-assign': 'error',
      'no-dupe-class-members': 'off',
      'no-var': 'error',
      'prefer-arrow-callback': 'error'
    }
  },
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error'
    }
  },
  ...compat.config({
    extends: ['plugin:@typescript-eslint/recommended', 'prettier']
  })
]
