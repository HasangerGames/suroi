// @ts-check
import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

import { platform } from "os";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    stylistic.configs.customize({
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
            eqeqeq: "error",

            // Stylistic
            ["@stylistic/arrow-parens"]: ["warn", "as-needed"],
            ["@stylistic/brace-style"]: ["warn", "1tbs", { allowSingleLine: true }],
            ["@stylistic/indent"]: ["warn", 4, { SwitchCase: 1 }],
            ["@stylistic/linebreak-style"]: platform() === "win32" ? ["off"] : ["warn", "unix"],
            ["@stylistic/member-delimiter-style"]: ["warn", { singleline: { delimiter: "comma" }, multiline: { delimiter: "none" } }],
            ["@stylistic/quotes"]: ["warn", "double", { avoidEscape: true }],
            ["@stylistic/space-before-function-paren"]: ["warn", "never"],
            ["@stylistic/no-multi-spaces"]: ["error", { ignoreEOLComments: true }],

            // @typescript-eslint
            ["@typescript-eslint/array-type"]: ["warn", { default: "array-simple" }],
            ["@typescript-eslint/prefer-literal-enum-member"]: ["error", { allowBitwiseExpressions: true }],
            ["@typescript-eslint/ban-ts-comment"]: ["error", {
                "ts-expect-error": "allow-with-description",
                "ts-ignore": true,
                "ts-nocheck": true,
                "ts-check": false,
                "minimumDescriptionLength": 5
            }],
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
            ["@typescript-eslint/restrict-template-expressions"]: ["error", {
                allowAny: true,
                allowBoolean: true,
                allowNullish: true,
                allowNumber: true,
                allowRegExp: true
            }],
            ["@typescript-eslint/prefer-readonly"]: "error",
            ["@typescript-eslint/no-unused-vars"]: ["error", {
                vars: "all",
                args: "none"
            }],

            // #region disabled rules

            /**
             * lol no
             */
            ["@stylistic/max-statements-per-line"]: "off",

            /**
             * Literal skill issue filter
             */
            ["no-cond-assign"]: "off",

            /**
             * Literal skill issue filter
             */
            ["no-return-assign"]: "off",

            /**
             * Rule is a bit too aggressive, and writing `void foo()`
             * conflicts with `@typescript-eslint/no-meaningless-void-operator`
             */
            ["@typescript-eslint/no-confusing-void-expression"]: "off",

            /**
             * This rule is just all-around annoying
             */
            ["@typescript-eslint/consistent-type-definitions"]: "off",

            /**
             * `this`-aliasing is useful to use a `this` context inside a construct which creates its own `this` binding.
             * (and thus overrides the surrounding one)
             *
             * The most common example of this is using an object literal inside a class instance, or a
             * `function` inside a class instance
             */
            ["@typescript-eslint/no-this-alias"]: "off",

            /**
             * ESLint also kinda mega sucks at detecting when this rule is actually appropriate, and sometimes
             * we want to conflate `false` and `undefined`/`null`.
             */
            ["@typescript-eslint/prefer-nullish-coalescing"]: "off",

            /**
             * Misbehaves with things like `void (async() => {})()`
             */
            ["@typescript-eslint/require-await"]: "off",

            /**
             * Honestly screw this rule, doesn't work well with constructing object literals
             */
            ["@typescript-eslint/prefer-reduce-type-parameter"]: "off",

            /**
             *  ESLint kinda massively sucks at correctly identifying an actually unnecessary condition
             *
             *  Furthermore, seemingly unnecessary conditions are sometimes nevertheless written, either as
             *  sanity checks, to provide a fallback, or to detect an abnormal and exceptional circumstance
             */
            ["@typescript-eslint/no-unnecessary-condition"]: "off",

            /**
             * ESLint doesn't understand how generic types work.
             */
            ["@typescript-eslint/no-unnecessary-type-parameters"]: "off",

            /**
             * These two methods do NOT have the same behavior, unlike what ESLint claims.
             */
            ["@typescript-eslint/prefer-regexp-exec"]: "off"

            // #endregion
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
