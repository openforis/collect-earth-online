module.exports = {
    env: {
        browser: true,
        es6: true
    },
    globals: {
        ol: false,
        angular: false,
        map_utils: false,
        mercator: false,
        utils: false
    },
    extends: "eslint:recommended",
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
                ImportDeclaration: "first"
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
        "no-console": [
            "error",
            {
                allow: [
                    "log",
                    "warn",
                    "error"
                ]
            }
        ]
    }
};
