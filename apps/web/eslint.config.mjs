import nextPlugin from 'eslint-config-next';

export default [
  ...nextPlugin,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
