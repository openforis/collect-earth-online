module.exports = {
    parser: "babel-eslint",
    parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: ["react"],
    env: {
        es6: true,
        browser: true,
        node: true
    },
    settings: {
        react: {
            version: "16.7.0"
        }
      },
    // globals: {
    //     React: false,
    //     ReactDOM: false
    // },
    // globals: {
    //     ol: false,
    //     angular: false,
    //     map_utils: false,
    //     mercator: false,
    //     ceoMapStyles: false,
    //     utils: false
    // },
    extends: ["eslint:recommended", "plugin:react/recommended"],
    rules: {
        indent: [
            "error",
            4,
            {
                FunctionDeclaration: {parameters: "first"},
                FunctionExpression: {parameters: "first"},
                CallExpression: {arguments: "first"},
                ArrayExpression: "first",
                ObjectExpression: "first",
                ImportDeclaration: "first",
                ignoredNodes: ["JSXAttribute", "JSXSpreadAttribute", "ConditionalExpression", "TemplateLiteral"]
            }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        quotes: [
            "error",
            "double"
        ],
        semi: [
            "error",
            "always"
        ],
        "no-var": [
            "error"
        ],
        // From Matt
        "arrow-body-style": ["error", "as-needed"],
        "brace-style": 2,
        "camelcase": 1,
        "comma-dangle": [1, "always-multiline"],
        "comma-spacing": 2,
        "comma-style":1,
        "computed-property-spacing": 1,
        "eol-last": 2,
        "eqeqeq": [2, "smart"],
        "keyword-spacing": 2,
        "no-trailing-spaces" : 2,
        "no-console": 0,
        "no-multi-spaces": 2,
        "no-useless-return": 1,
        "no-unused-vars": 1,
        "no-var": 2,
        "object-curly-newline": [1, { "multiline": true, "consistent": true }],
        "object-curly-spacing": [1, "always", { "objectsInObjects": false }],
        "object-property-newline": ["error", { "allowAllPropertiesOnSameLine": true }],
        "prefer-const": 2,
        "react/button-has-type": 1,
        "react/jsx-closing-bracket-location": 1,
        "react/jsx-first-prop-new-line": [2, "multiline"],
        "react/no-unused-state": 1,
        "space-infix-ops": 2,
        "space-before-blocks": 2,
        // From Gary
        "consistent-return": [0],
        "key-spacing": [0],
        "no-use-before-define": [2, "nofunc"],
        "jsx-quotes"       : 1,
        "react/display-name": 0,
        "react/forbid-prop-types": 0,
        "react/jsx-boolean-value": 1,
        // "react/jsx-closing-bracket-location": 0,
        "react/jsx-curly-spacing": 1,
        "react/jsx-handler-names": 0,
        "react/jsx-indent-props": [2, 4],
        "react/jsx-indent": 1,
        "react/jsx-key": 1,
        "react/jsx-max-props-per-line": [2, { "when": "multiline", "maximum": 1 }],
        "react/jsx-no-bind": 0,
        "react/jsx-no-duplicate-props": 1,
        "react/jsx-no-literals": 0,
        "react/jsx-no-undef": 1,
        "react/jsx-pascal-case": 1,
        "react/jsx-sort-prop-types": 0,
        "react/jsx-sort-props": 0,
        "react/jsx-uses-react": 1,
        "react/jsx-uses-vars": 1,
        "react/no-danger": 1,
        "react/no-deprecated": 1,
        "react/no-did-mount-set-state": 0,
        "react/no-did-update-set-state": 0,
        "react/no-direct-mutation-state": 1,
        "react/no-is-mounted": 1,
        "react/no-multi-comp": 0,
        "react/no-set-state": 0,
        "react/no-string-refs": 0,
        "react/no-unknown-property": 1,
        "react/prefer-es6-class": 1,
        "react/prop-types": 0,
        "react/react-in-jsx-scope": 1,
        // "react/require-extension": 1,
        "react/self-closing-comp": 0,
        "react/sort-comp": 1,
        // "react/wrap-multilines": 1
    }
};
