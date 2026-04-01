import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['utils.js', 'utils.test.js'],
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'eqeqeq': ['error', 'always'],
      'no-console': 'warn',
    },
  },
];
