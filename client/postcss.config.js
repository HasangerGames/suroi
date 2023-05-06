/** @type {import('postcss-load-config').Config} */
const config = {
    plugins: [
        "postcss-preset-env",
        require("autoprefixer"),
        require("postcss-import")
    ]
};

module.exports = config;
