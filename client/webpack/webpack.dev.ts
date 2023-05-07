/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import merge from "webpack-merge";
import common from "./webpack.common";

import { DefinePlugin } from "webpack";

import * as path from "path";

const config = merge(common, {
    mode: "development",
    devtool: "source-map",

    output: {
        path: path.resolve(__dirname, "../dist"),
        filename: "js/[name].[chunkhash:8].js"
    },

    devServer: {
        devMiddleware: { publicPath: "http://127.0.0.1:3000" },
        static: { directory: path.resolve(__dirname, "../public") },
        historyApiFallback: true,
        port: 3000
    },

    plugins: [
        new DefinePlugin({ API_URL: "\"http://127.0.0.1:8000/api\"" })
    ]
});

export default config;
