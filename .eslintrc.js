module.exports = {
    env: {
        browser: false,
        es2021: true,
        node: true,
        jest: true,
    },
    extends: ['airbnb-base', 'prettier'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        'no-console': 'off',
        'no-underscore-dangle': 'off',
        'consistent-return': 'off',
        'func-names': 'off',
        'object-shorthand': 'off',
        'no-process-exit': 'off',
        'no-param-reassign': 'off',
        'class-methods-use-this': 'off',
        'prefer-destructuring': ['error', { object: true, array: false }],
        'no-unused-vars': ['error', { argsIgnorePattern: 'req|res|next|val' }],
    },
};
