module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    '@electron-toolkit',
    '@electron-toolkit/eslint-config-prettier',
  ],
  rules: {
    'no-case-declarations': 0,
    'no-constant-condition': 1,
    'react/prop-types': 0,
  },
}
