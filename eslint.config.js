// @ts-check
const expo = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  ...expo,
  prettier,
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
      // S6: prevent `{expr && <Component/>}` from leaking 0/"" as children.
      // Also enforced as a blocking gate via eslint.structure.config.js.
      'react/jsx-no-leaked-render': [
        'error',
        { validStrategies: ['ternary', 'coerce'] },
      ],
    },
  },
];
