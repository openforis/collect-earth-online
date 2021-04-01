module.exports = {
    parser: "babel-eslint",
    parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: [
        "@babel",
        "react"
    ],
    env: {
        es2021: true,
        browser: true,
        node: true
    },
    settings: {
        react: {
            version: "16.13.1"
        }
    },
    extends: [
        "eslint:recommended",
        "plugin:react/recommended",
        "airbnb"
    ],
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
        // Override defaults
        "import/prefer-default-export": 0,
        "jsx-a11y/label-has-associated-control": 0,
        "jsx-a11y/click-events-have-key-events": 0,
        "jsx-a11y/no-static-element-interactions": 0,
        "jsx-a11y/no-noninteractive-element-interactions": 0,
        "no-alert": 0,
        "no-else-return": 0,
        "no-nested-ternary": 0,
        "no-restricted-globals": 0,
        "max-classes-per-file": 0,
        "prefer-template": 0,
        "radix": 0,
        "react/destructuring-assignment": 0,
        "react/jsx-filename-extension": 0,
        "react/jsx-props-no-spreading": 0,
        "react/jsx-indent": 0,
        "react/no-access-state-in-setstate": 0,
        // From Matt
        "@babel/no-invalid-this": "error",
        "@babel/no-unused-expressions": "error",
        "@babel/object-curly-spacing": "error",
        "@babel/semi": "error",
        "arrow-body-style": ["error", "as-needed"],
        "arrow-spacing": 2,
        "brace-style": 2,
        "camelcase": 1,
        "comma-dangle": [1, "never"],
        "comma-spacing": 2,
        "comma-style":1,
        "computed-property-spacing": 1,
        "eol-last": 2,
        "eqeqeq": [2, "smart"],
        "keyword-spacing": 2,
        "no-trailing-spaces" : 2,
        "no-console": 0,
        "no-duplicate-imports": 1,
        "no-multi-spaces": 2,
        "no-prototype-builtins": 0,
        "no-useless-return": 1,
        "no-unused-vars": 1,
        "no-var": 2,
        "object-curly-newline": [1, {"multiline": true, "consistent": true}],
        "object-curly-spacing": [1, "never"],
        "object-property-newline": ["error", {"allowAllPropertiesOnSameLine": true}],
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
        "jsx-quotes": 1,
        "react/forbid-prop-types": 2,
        "react/jsx-boolean-value": 1,
        "react/jsx-curly-spacing": 1,
        "react/jsx-handler-names": 0,
        "react/jsx-indent-props": [2, 4],
        "react/jsx-max-props-per-line": [2, {"when": "multiline", "maximum": 1}],
        "react/jsx-no-bind": 0,
        "react/jsx-no-literals": 0,
        "react/jsx-props-no-multi-spaces": 1,
        "react/jsx-no-useless-fragment": 1,
        "react/jsx-one-expression-per-line": 0,
        "react/jsx-pascal-case": 1,
        "react/jsx-sort-props": 1,
        "react/no-danger": 1,
        "react/no-danger-with-children": 1,
        "react/no-deprecated": 1,
        "react/no-did-mount-set-state": 1,
        "react/no-did-update-set-state": 1,
        "react/no-multi-comp": 0,
        "react/no-set-state": 0,
        "react/no-unknown-property": 1,
        "react/prefer-es6-class": 1,
        "react/prop-types": 0,
        "react/self-closing-comp": 1,
        "react/sort-comp": 1,
        "react/sort-prop-types": 1
    }
};
