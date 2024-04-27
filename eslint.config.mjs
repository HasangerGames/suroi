// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

/**
 * @todo Add eslint-plugin-import-x, when it has support for Flat configuration.
 */
export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    stylistic.configs.customize({
        flat: true,
        indent: 4,
        semi: true,
        commaDangle: "never"
    }),
    {
        languageOptions: {
            parserOptions: {
                project: "tsconfig.eslint.json",
                tsconfigRootDir: import.meta.dirname,
                warnOnUnsupportedTypeScriptVersion: false
            }
        },
        plugins: {
            ["@stylistic"]: stylistic
        },
        rules: {
            // ESLint
            curly: ["warn", "multi-line"],
            ["prefer-arrow-callback"]: "warn",
            ["prefer-template"]: "warn",
            yoda: ["error", "never", { onlyEquality: true }],

            // Stylistic
            ["@stylistic/arrow-parens"]: ["warn", "as-needed"],
            ["@stylistic/brace-style"]: ["warn", "1tbs", { allowSingleLine: true }],
            ["@stylistic/indent"]: ["warn", 4, { SwitchCase: 1 }],
            ["@stylistic/linebreak-style"]: ["warn", "unix"],
            ["@stylistic/max-statements-per-line"]: "off",
            ["@stylistic/member-delimiter-style"]: ["warn", { singleline: { delimiter: "comma" }, multiline: { delimiter: "none" } }],
            ["@stylistic/quotes"]: ["warn", "double", { avoidEscape: true }],
            ["@stylistic/space-before-function-paren"]: ["warn", "never"],
            ["@stylistic/type-generic-spacing"]: "off",

            // @typescript-eslint
            ["@typescript-eslint/array-type"]: ["warn", { default: "array-simple" }],
            ["@typescript-eslint/ban-ts-comment"]: "off",
            ["@typescript-eslint/consistent-type-definitions"]: "off",
            ["@typescript-eslint/explicit-function-return-type"]: ["warn", {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
                allowHigherOrderFunctions: true,
                allowDirectConstAssertionInArrowFunctions: true,
                allowConciseArrowFunctionExpressionsStartingWithVoid: false,
                allowFunctionsWithoutTypeParameters: false,
                allowedNames: [],
                allowIIFEs: false
            }],
            ["@typescript-eslint/no-confusing-void-expression"]: "off",
            ["@typescript-eslint/no-this-alias"]: "off",
            ["@typescript-eslint/prefer-literal-enum-member"]: "off",
            ["@typescript-eslint/prefer-nullish-coalescing"]: "off",
            ["@typescript-eslint/restrict-template-expressions"]: ["error", {
                allowAny: true,
                allowBoolean: true,
                allowNullish: true,
                allowNumber: true,
                allowRegExp: true
            }],
            ["@typescript-eslint/use-unknown-in-catch-callback-variable"]: "off",

            // Type-safety rules disabled as the codebase contains unsafe code.
            ["@typescript-eslint/no-explicit-any"]: "off",
            ["@typescript-eslint/no-non-null-assertion"]: "off",
            ["@typescript-eslint/no-unsafe-argument"]: "off",
            ["@typescript-eslint/no-unsafe-assignment"]: "off",
            ["@typescript-eslint/no-unsafe-call"]: "off",
            ["@typescript-eslint/no-unsafe-member-access"]: "off",
            ["@typescript-eslint/no-unsafe-return"]: "off",

            // Suroi developers specifically cannot write safe code.
            ["@typescript-eslint/no-empty-function"]: "off",
            ["@typescript-eslint/no-redundant-type-constituents"]: "off",
            ["@typescript-eslint/no-unnecessary-condition"]: "off",
            ["@typescript-eslint/no-unsafe-enum-comparison"]: "off",
            ["@typescript-eslint/no-unused-vars"]: "off",
            ["@typescript-eslint/require-await"]: "off",
            ["no-empty"]: "off"
        }
    },
    {
        ignores: [
            "common/dist/**",
            "client/dist/**",
            "server/dist/**",
            "tests/dist/**"
        ]
    }
);
