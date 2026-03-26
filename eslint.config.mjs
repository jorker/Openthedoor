import nextConfig from 'eslint-config-next/core-web-vitals';

const disabledRules = new Set([
  '@next/next/no-assign-module-variable',
  '@next/next/no-img-element',
  'import/no-anonymous-default-export',
  'jsx-a11y/alt-text',
  'jsx-a11y/aria-props',
  'jsx-a11y/aria-proptypes',
  'jsx-a11y/aria-unsupported-elements',
  'jsx-a11y/role-has-required-aria-props',
  'jsx-a11y/role-supports-aria-props',
  'react/display-name',
  'react-hooks/exhaustive-deps',
  'react-hooks/error-boundaries',
  'react-hooks/immutability',
  'react-hooks/incompatible-library',
  'react-hooks/purity',
  'react-hooks/set-state-in-effect',
  'react-hooks/static-components',
  'react-hooks/unsupported-syntax',
]);

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'out/**'],
  },
  ...nextConfig.map((entry) => {
    const rules = {};

    for (const [ruleName, ruleConfig] of Object.entries(entry.rules ?? {})) {
      rules[ruleName] = disabledRules.has(ruleName) ? 'off' : ruleConfig;
    }

    return {
      ...entry,
      rules,
    };
  }),
];
