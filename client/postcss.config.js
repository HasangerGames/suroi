// @ts-check
import postcssPresetEnv from "postcss-preset-env";
import postcssImport from "postcss-import";

export default {
    plugins: [
        postcssImport,
        // i don't know why eslint is freaking out over this
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        postcssPresetEnv({
            features: {
                "nesting-rules": {
                    noIsPseudoSelector: false
                }
            }
        })
    ]
};
