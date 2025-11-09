// @ts-check
import postcssPresetEnv from "postcss-preset-env";
import postcssImport from "postcss-import";

export default {
    plugins: [
        postcssImport,
        postcssPresetEnv({
            features: {
                "nesting-rules": {
                    noIsPseudoSelector: false
                }
            }
        })
    ]
};
