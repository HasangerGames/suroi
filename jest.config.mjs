// @ts-check

/** @type {import("jest").Config} */
const config = {
    projects: [
        {
            runner: "jest-runner-eslint",
            displayName: "lint",
            testMatch: [
                "<rootDir>/common/src/**/*.ts",
                "<rootDir>/client/src/**/*.ts",
                "<rootDir>/client/editor/src/**/*.ts",
                "<rootDir>/client/vite/*.ts",
                "<rootDir>/client/vite.config.ts",
                "<rootDir>/client/postcss.config.js",
                "<rootDir>/client/svelte.config.js",
                "<rootDir>/server/src/**/*.ts",
                "<rootDir>/tests/src/**/*.ts",
                "<rootDir>/eslint.config.mjs",
                "<rootDir>/jest.config.mjs"
            ],
            testPathIgnorePatterns: ["dist"]
        }
    ]
};

export default config;
