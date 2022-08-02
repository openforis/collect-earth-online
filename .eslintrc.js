module.exports = {
  parser: "babel-eslint",
  parserOptions: {
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["@babel", "react"],
  env: {
    es2021: true,
    browser: true,
    node: true,
  },
  settings: {
    react: {
      version: "16.13.1",
    },
  },
  extends: ["eslint:recommended", "plugin:react/recommended", "airbnb"],
  rules: {
    indent: [
      "error",
      4,
      {
        FunctionDeclaration: { parameters: "first" },
        FunctionExpression: { parameters: "first" },
        CallExpression: { arguments: "first" },
        ArrayExpression: "first",
        ObjectExpression: "first",
        ImportDeclaration: "first",
        ignoredNodes: ["TemplateLiteral"],
      },
    ],
    // Override recommends
    "import/prefer-default-export": 0,
    "implicit-arrow-linebreak": 0,
    "jsx-a11y/label-has-associated-control": 0,
    "jsx-a11y/click-events-have-key-events": 0,
    "jsx-a11y/no-static-element-interactions": 0,
    "jsx-a11y/no-noninteractive-element-interactions": 0,
    "max-classes-per-file": 0,
    "no-alert": 0,
    "no-else-return": 0,
    "no-nested-ternary": 0,
    "no-param-reassign": 1, // Error
    "no-restricted-globals": 0,
    "no-underscore-dangle": 1, // Error
    "prefer-template": 0,
    "prefer-promise-reject-errors": 0,
    "prefer-spread": 1, // Error
    "quote-props": [0, "consistent"],
    radix: 0,
    "react/destructuring-assignment": 0,
    "react/jsx-filename-extension": 0,
    "react/jsx-props-no-spreading": 0,
    "react/jsx-indent": 0,
    "react/no-access-state-in-setstate": 0,
    "template-curly-spacing": 0, // Disable due to null error

    // Experimental
    "@babel/no-invalid-this": "error",
    "@babel/no-unused-expressions": "error",
    "@babel/object-curly-spacing": "error",
    "@babel/semi": "error",

    // ESLint
    "arrow-parens": ["error", "as-needed"],
    "arrow-body-style": ["error", "as-needed"],
    "arrow-spacing": 1, // Error
    "brace-style": 1, // Error
    camelcase: 1,
    "consistent-return": [0],
    "comma-dangle": [1, "never"],
    "comma-spacing": 1, // Error
    "comma-style": 1,
    "computed-property-spacing": 1,
    "eol-last": 1, // Error
    eqeqeq: [2, "smart"],
    "jsx-quotes": 1,
    "key-spacing": [0],
    "keyword-spacing": 1, // Error
    "linebreak-style": ["error", "unix"],
    "max-len": [
      1,
      {
        code: 120,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ], // Error
    "no-trailing-spaces": 1, // Error
    "no-console": 0,
    "no-duplicate-imports": 1,
    "no-multi-spaces": 1, // Error
    "no-prototype-builtins": 0,
    "no-return-assign": 1, // Error
    "no-use-before-define": [1, "nofunc"], // Error
    "no-useless-return": 1,
    "no-unused-vars": [1, { argsIgnorePattern: "^_" }],
    "no-unused-imports": 0,
    "no-var": 1, // Error
    "object-curly-newline": [1, { multiline: true, consistent: true }],
    "object-curly-spacing": [1, "never"],
    "object-property-newline": ["error", { allowAllPropertiesOnSameLine: true }],
    "prefer-const": 1, // Error
    "prefer-destructuring": [1, { array: false }],
    quotes: ["error", "double"],
    "space-infix-ops": 1, // Error
    "space-before-blocks": 1, // Error
    "spaced-comment": ["error", "always", { markers: ["/"], exceptions: ["***"] }],

    // React
    "react/forbid-prop-types": 1, // Error
    "react/jsx-boolean-value": 1,
    "react/jsx-closing-bracket-location": 1,
    "react/jsx-curly-spacing": 1,
    "react/jsx-curly-newline": [1, { multiline: "forbid", singleline: "forbid" }],
    "react/jsx-first-prop-new-line": [1, "multiline"], // Error
    "react/jsx-handler-names": 0,
    "react/jsx-indent-props": [1, 4], // Error
    "react/jsx-max-props-per-line": [1, { when: "multiline", maximum: 1 }], // Error
    "react/jsx-no-bind": 0,
    "react/jsx-no-literals": 0,
    "react/jsx-no-useless-fragment": 1,
    "react/jsx-one-expression-per-line": 0,
    "react/jsx-pascal-case": 1,
    "react/jsx-props-no-multi-spaces": 1,
    "react/jsx-sort-props": 1,
    "react/jsx-tag-spacing": [1, { beforeSelfClosing: "never" }], // Error
    "react/button-has-type": 1,
    "react/no-array-index-key": 1, // Error
    "react/no-danger": 1,
    "react/no-danger-with-children": 1,
    "react/no-deprecated": 1,
    "react/no-did-mount-set-state": 2,
    "react/no-did-update-set-state": 1,
    "react/no-multi-comp": 0,
    "react/no-set-state": 0,
    "react/no-unknown-property": 1,
    "react/no-unused-state": 1,
    "react/prefer-es6-class": 1,
    "react/prop-types": 0,
    "react/self-closing-comp": 1,
    "react/sort-comp": 1,
    "react/sort-prop-types": 1,
  },
};
