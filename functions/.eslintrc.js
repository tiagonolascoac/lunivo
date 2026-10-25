module.exports = {
  root: true,

  env: {
    es6: true,
    node: true,
  },

  extends: [
    'eslint:recommended',
    'google',
  ],

  parserOptions: {
    ecmaVersion: 2022,
  },

  rules: {
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off',
  },
};
