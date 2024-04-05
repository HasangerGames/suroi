// ../package.json
var package_default = {
  name: "suroi",
  version: "0.17.0",
  description: "An open-source 2D battle royale game inspired by surviv.io",
  private: true,
  scripts: {
    build: "pnpm -r build",
    "build:client": "cd client && pnpm build",
    "build:server": "cd server && pnpm build",
    start: "node --enable-source-maps server/dist/server/src/server.js",
    moderation: "node --enable-source-maps server/dist/server/src/moderation.js",
    warn: "pnpm moderation warn",
    ban: "pnpm moderation ban",
    unban: "pnpm moderation unban",
    dev: "pnpm -r dev",
    "dev:client": "cd client && pnpm dev",
    "dev:server": "cd server && pnpm dev",
    "dev:test": "cd tests && pnpm stressTest",
    lint: "eslint . --fix --ext .js,.ts",
    "lint:ci": "eslint . --max-warnings 0 --ext .js,.ts",
    validateDefinitions: "cd tests && tsc && pnpm validateDefinitions",
    "full-reinstall": "rm -r node_modules pnpm-lock.yaml client/node_modules server/node_modules common/node_modules tests/node_modules && pnpm install"
  },
  engines: {
    node: ">=18.8.0",
    pnpm: ">=8.0.0"
  },
  keywords: [
    "nodejs",
    "typescript"
  ],
  license: "GPL-3.0",
  devDependencies: {
    "@typescript-eslint/eslint-plugin": "^7.5.0",
    "@typescript-eslint/parser": "^7.5.0",
    eslint: "^8.57.0",
    "eslint-config-love": "^43.1.0",
    "eslint-plugin-import": "^2.29.1",
    "eslint-plugin-n": "^16.6.2",
    "eslint-plugin-promise": "^6.1.1",
    typescript: "^5.4.3"
  }
};

// vite.config.ts
import { defineConfig } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/vite@5.2.7_@types+node@20.11.30_sass@1.72.0/node_modules/vite/dist/node/index.js";

// vite/vite.prod.ts
import { mergeConfig } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/vite@5.2.7_@types+node@20.11.30_sass@1.72.0/node_modules/vite/dist/node/index.js";

// vite/vite.common.ts
import { splitVendorChunkPlugin } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/vite@5.2.7_@types+node@20.11.30_sass@1.72.0/node_modules/vite/dist/node/index.js";
import { ViteImageOptimizer } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/vite-plugin-image-optimizer@1.1.7_vite@5.2.7/node_modules/vite-plugin-image-optimizer/dist/index.mjs";
import { svelte } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/@sveltejs+vite-plugin-svelte@3.0.2_svelte@4.2.12_vite@5.2.7/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import { resolve as resolve3 } from "path";

// vite/vite-spritesheet-plugin/spritesheet-plugin.ts
import { watch } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/chokidar@3.6.0/node_modules/chokidar/index.js";
import { Minimatch } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/minimatch@9.0.4/node_modules/minimatch/dist/esm/index.js";

// vite/vite-spritesheet-plugin/utils/readDirectory.ts
import * as path from "path";
import * as fs from "fs";
var readDirectory = (dir) => {
  let results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat?.isDirectory()) {
      const res = readDirectory(filePath);
      results = results.concat(res);
    } else
      results.push(filePath);
  }
  return results;
};
var readDirectory_default = readDirectory;

// vite/vite-spritesheet-plugin/utils/spritesheet.ts
import { platform } from "os";
import { createHash } from "crypto";
import { MaxRectsPacker } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/maxrects-packer@2.7.3/node_modules/maxrects-packer/dist/maxrects-packer.js";
import { createCanvas, loadImage } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/canvas@2.11.2/node_modules/canvas/index.js";
import "file:///home/henry/Programming/Suroi/node_modules/.pnpm/pixi.js@8.0.4/node_modules/pixi.js/lib/index.mjs";
var supportedFormats = ["png", "jpeg"];
async function createSpritesheets(paths, options) {
  if (paths.length === 0)
    throw new Error("No file given.");
  if (!supportedFormats.includes(options.outputFormat)) {
    const supported = JSON.stringify(supportedFormats);
    throw new Error(`outputFormat should only be one of ${supported}, but "${options.outputFormat}" was given.`);
  }
  const images = [];
  await Promise.all(paths.map(async (path2) => {
    const image = await loadImage(path2);
    images.push({
      image,
      path: path2
    });
  }));
  function createSheet(resolution) {
    const packer = new MaxRectsPacker(
      options.maximumSize * resolution,
      options.maximumSize * resolution,
      options.margin,
      {
        ...options.packerOptions,
        allowRotation: false
        // TODO: support rotating frames
      }
    );
    for (const image of images) {
      packer.add(
        image.image.width * resolution,
        image.image.height * resolution,
        image
      );
    }
    const atlases = [];
    for (const bin of packer.bins) {
      const canvas = createCanvas(bin.width, bin.height);
      const ctx = canvas.getContext("2d");
      const json = {
        meta: {
          image: "",
          scale: resolution,
          size: {
            w: bin.width,
            h: bin.height
          }
        },
        frames: {}
      };
      for (const rect of bin.rects) {
        const data = rect.data;
        ctx.drawImage(data.image, rect.x, rect.y, rect.width, rect.height);
        const sourceParts = rect.data.path.split(platform() === "win32" ? "\\" : "/");
        let name = sourceParts.slice(sourceParts.length - 1, sourceParts.length).join();
        if (options.removeExtensions) {
          const temp = name.split(".");
          temp.splice(temp.length - 1, 1);
          name = temp.join();
        }
        json.frames[name] = {
          frame: {
            w: rect.width,
            h: rect.height,
            x: rect.x,
            y: rect.y
          },
          sourceSize: {
            w: rect.width,
            h: rect.height
          }
        };
      }
      const buffer = canvas.toBuffer(`image/${options.outputFormat}`);
      const hash = createHash("sha1");
      hash.setEncoding("hex");
      hash.write(buffer);
      hash.end();
      const sha1 = hash.read().slice(0, 8);
      json.meta.image = `${options.outDir}/${options.name}-${sha1}@${resolution}x.${options.outputFormat}`;
      atlases.push({
        json,
        image: buffer
      });
    }
    return atlases;
  }
  return {
    low: createSheet(0.5),
    high: createSheet(1)
  };
}

// vite/vite-spritesheet-plugin/spritesheet-plugin.ts
import { resolve as resolve2 } from "path";

// ../common/src/definitions/modes.ts
var Modes = [
  {
    idString: "normal",
    colors: {
      grass: "hsl(113, 42%, 42%)",
      water: "hsl(211, 63%, 42%)",
      border: "hsl(211, 63%, 30%)",
      beach: "hsl(40, 39%, 55%)",
      riverBank: "hsl(33, 50%, 30%)",
      gas: "hsla(17, 100%, 50%, 0.55)"
    }
  },
  {
    idString: "halloween",
    colors: {
      grass: "hsl(65, 100%, 12%)",
      water: "hsl(4, 100%, 14%)",
      border: "hsl(4, 90%, 12%)",
      beach: "hsl(33, 77%, 21%)",
      riverBank: "hsl(33, 50%, 30%)",
      gas: "hsla(17, 100%, 50%, 0.55)"
    },
    specialMenuMusic: true,
    reskin: "fall"
  },
  {
    idString: "fall",
    colors: {
      grass: "hsl(113, 42%, 42%)",
      water: "hsl(211, 63%, 42%)",
      border: "hsl(211, 63%, 30%)",
      beach: "hsl(40, 39%, 55%)",
      riverBank: "hsl(33, 50%, 30%)",
      gas: "hsla(17, 100%, 50%, 0.55)"
    },
    reskin: "fall"
  },
  {
    idString: "winter",
    colors: {
      grass: "hsl(210, 18%, 82%)",
      water: "hsl(211, 63%, 42%)",
      border: "hsl(208, 94%, 45%)",
      beach: "hsl(210, 18%, 75%)",
      riverBank: "hsl(210, 18%, 70%)",
      gas: "hsla(17, 100%, 50%, 0.55)"
    },
    specialMenuMusic: true,
    reskin: "winter",
    bulletTrailAdjust: "hsl(0, 50%, 80%)"
  }
];
var tempList = Modes.filter((mode) => mode.reskin !== void 0).map((mode) => mode.reskin);
var ModeAtlases = tempList.filter((item, index) => tempList.indexOf(item) === index);

// vite/vite-spritesheet-plugin/spritesheet-plugin.ts
import "file:///home/henry/Programming/Suroi/node_modules/.pnpm/pixi.js@8.0.4/node_modules/pixi.js/lib/index.mjs";
var defaultGlob = "**/*.{png,gif,jpg,bmp,tiff,svg}";
var imagesMatcher = new Minimatch(defaultGlob);
var PLUGIN_NAME = "vite-spritesheet-plugin";
var compilerOpts = {
  outputFormat: "png",
  outDir: "atlases",
  margin: 8,
  removeExtensions: true,
  maximumSize: 4096,
  name: "",
  packerOptions: {}
};
var atlasesToBuild = {
  main: "public/img/game"
};
for (const atlasId of ModeAtlases) {
  atlasesToBuild[atlasId] = `public/img/modes/${atlasId}`;
}
var foldersToWatch = Object.values(atlasesToBuild);
async function buildSpritesheets() {
  const atlases = {};
  for (const atlasId in atlasesToBuild) {
    const files = readDirectory_default(atlasesToBuild[atlasId]).filter((x) => imagesMatcher.match(x));
    atlases[atlasId] = await createSpritesheets(files, {
      ...compilerOpts,
      name: atlasId
    });
  }
  return atlases;
}
function spritesheet() {
  let watcher;
  let config4;
  const highResVirtualModuleId = "virtual:spritesheets-jsons-high-res";
  const highResresolvedVirtualModuleId = `\0${highResVirtualModuleId}`;
  const lowResVirtualModuleId = "virtual:spritesheets-jsons-low-res";
  const lowResResolvedVirtualModuleId = `\0${lowResVirtualModuleId}`;
  let atlases = {};
  const exportedAtlases = {
    low: {},
    high: {}
  };
  let buildTimeout;
  return [
    {
      name: `${PLUGIN_NAME}:build`,
      apply: "build",
      async buildStart() {
        this.info("Building spritesheets");
        atlases = await buildSpritesheets();
        for (const atlasId in atlases) {
          exportedAtlases.high[atlasId] = atlases[atlasId].high.map((sheet) => sheet.json);
          exportedAtlases.low[atlasId] = atlases[atlasId].low.map((sheet) => sheet.json);
        }
      },
      generateBundle() {
        for (const atlasId in atlases) {
          const sheets = atlases[atlasId];
          for (const sheet of [...sheets.low, ...sheets.high]) {
            this.emitFile({
              type: "asset",
              fileName: sheet.json.meta.image,
              source: sheet.image
            });
            this.info(`Built spritesheet ${sheet.json.meta.image}`);
          }
        }
      },
      resolveId(id) {
        if (id === highResVirtualModuleId) {
          return highResresolvedVirtualModuleId;
        } else if (id === lowResVirtualModuleId) {
          return lowResResolvedVirtualModuleId;
        }
      },
      load(id) {
        if (id === highResresolvedVirtualModuleId) {
          return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.high)}')`;
        } else if (id === lowResResolvedVirtualModuleId) {
          return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.low)}')`;
        }
      }
    },
    {
      name: `${PLUGIN_NAME}:serve`,
      apply: "serve",
      configResolved(cfg) {
        config4 = cfg;
      },
      async configureServer(server) {
        function reloadPage() {
          clearTimeout(buildTimeout);
          buildTimeout = setTimeout(() => {
            config4.logger.info("Rebuilding spritesheets");
            buildSheets().then(() => {
              const module = server.moduleGraph.getModuleById(highResVirtualModuleId);
              if (module !== void 0)
                void server.reloadModule(module);
              const module2 = server.moduleGraph.getModuleById(lowResVirtualModuleId);
              if (module2 !== void 0)
                void server.reloadModule(module2);
            }).catch(console.error);
          }, 500);
        }
        watcher = watch(foldersToWatch.map((pattern) => resolve2(pattern, defaultGlob)), {
          cwd: config4.root,
          ignoreInitial: true
        }).on("add", reloadPage).on("change", reloadPage).on("unlink", reloadPage);
        const files = /* @__PURE__ */ new Map();
        async function buildSheets() {
          atlases = await buildSpritesheets();
          for (const atlasId in atlases) {
            exportedAtlases.high[atlasId] = atlases[atlasId].high.map((sheet) => sheet.json);
            exportedAtlases.low[atlasId] = atlases[atlasId].low.map((sheet) => sheet.json);
          }
          files.clear();
          for (const atlasId in atlases) {
            const sheets = atlases[atlasId];
            for (const sheet of [...sheets.low, ...sheets.high]) {
              files.set(sheet.json.meta.image, sheet.image);
            }
          }
        }
        await buildSheets();
        return () => {
          server.middlewares.use((req, res, next) => {
            if (req.originalUrl === void 0)
              return next();
            const file = files.get(req.originalUrl.slice(1));
            if (file === void 0)
              return next();
            res.writeHead(200, {
              "Content-Type": `image/${compilerOpts.outputFormat}`
            });
            res.end(file);
          });
        };
      },
      closeBundle: async () => {
        await watcher.close();
      },
      resolveId(id) {
        if (id === highResVirtualModuleId) {
          return highResresolvedVirtualModuleId;
        } else if (id === lowResVirtualModuleId) {
          return lowResResolvedVirtualModuleId;
        }
      },
      load(id) {
        if (id === highResresolvedVirtualModuleId) {
          return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.high)}')`;
        } else if (id === lowResResolvedVirtualModuleId) {
          return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.low)}')`;
        }
      }
    }
  ];
}

// vite/vite.common.ts
var __vite_injected_original_dirname = "/home/henry/Programming/Suroi/client/vite";
var config = {
  build: {
    rollupOptions: {
      input: {
        main: resolve3(__vite_injected_original_dirname, "../index.html"),
        changelog: resolve3(__vite_injected_original_dirname, "../changelog/index.html"),
        news: resolve3(__vite_injected_original_dirname, "../news/index.html"),
        rules: resolve3(__vite_injected_original_dirname, "../rules/index.html"),
        editor: resolve3(__vite_injected_original_dirname, "../editor/index.html"),
        wiki: resolve3(__vite_injected_original_dirname, "../wiki/index.html")
      }
    }
  },
  plugins: [
    svelte(),
    splitVendorChunkPlugin(),
    ViteImageOptimizer({
      test: /\.(svg)$/i,
      logStats: false
    }),
    spritesheet()
  ],
  define: {
    APP_VERSION: JSON.stringify(`${package_default.version}`)
  }
};
var vite_common_default = config;

// vite/vite.prod.ts
var config2 = {
  define: {
    API_URL: JSON.stringify("/api")
  }
};
var vite_prod_default = mergeConfig(vite_common_default, config2);

// vite/vite.dev.ts
import { mergeConfig as mergeConfig2 } from "file:///home/henry/Programming/Suroi/node_modules/.pnpm/vite@5.2.7_@types+node@20.11.30_sass@1.72.0/node_modules/vite/dist/node/index.js";
var config3 = {
  server: {
    port: 3e3,
    strictPort: true,
    host: "0.0.0.0"
  },
  preview: {
    port: 3e3,
    strictPort: true,
    host: "0.0.0.0"
  },
  define: {
    API_URL: JSON.stringify("http://localhost:8080/api")
  }
};
var vite_dev_default = mergeConfig2(vite_common_default, config3);

// vite.config.ts
import { existsSync, rmSync } from "fs";
import { dirname, resolve as resolve4 } from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///home/henry/Programming/Suroi/client/vite.config.ts";
var DIRNAME = dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig(({ command, mode }) => {
  process.env = {
    ...process.env,
    VITE_APP_VERSION: package_default.version
  };
  if (command === "serve" && mode === "development") {
    if (existsSync(resolve4(DIRNAME, "./dist"))) {
      rmSync(resolve4(DIRNAME, "./dist"), { recursive: true, force: true });
    }
  }
  return command === "serve" ? vite_dev_default : vite_prod_default;
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcGFja2FnZS5qc29uIiwgInZpdGUuY29uZmlnLnRzIiwgInZpdGUvdml0ZS5wcm9kLnRzIiwgInZpdGUvdml0ZS5jb21tb24udHMiLCAidml0ZS92aXRlLXNwcml0ZXNoZWV0LXBsdWdpbi9zcHJpdGVzaGVldC1wbHVnaW4udHMiLCAidml0ZS92aXRlLXNwcml0ZXNoZWV0LXBsdWdpbi91dGlscy9yZWFkRGlyZWN0b3J5LnRzIiwgInZpdGUvdml0ZS1zcHJpdGVzaGVldC1wbHVnaW4vdXRpbHMvc3ByaXRlc2hlZXQudHMiLCAiLi4vY29tbW9uL3NyYy9kZWZpbml0aW9ucy9tb2Rlcy50cyIsICJ2aXRlL3ZpdGUuZGV2LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJ7XG4gIFwibmFtZVwiOiBcInN1cm9pXCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMTcuMFwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3Blbi1zb3VyY2UgMkQgYmF0dGxlIHJveWFsZSBnYW1lIGluc3BpcmVkIGJ5IHN1cnZpdi5pb1wiLFxuICBcInByaXZhdGVcIjogdHJ1ZSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImJ1aWxkXCI6IFwicG5wbSAtciBidWlsZFwiLFxuICAgIFwiYnVpbGQ6Y2xpZW50XCI6IFwiY2QgY2xpZW50ICYmIHBucG0gYnVpbGRcIixcbiAgICBcImJ1aWxkOnNlcnZlclwiOiBcImNkIHNlcnZlciAmJiBwbnBtIGJ1aWxkXCIsXG4gICAgXCJzdGFydFwiOiBcIm5vZGUgLS1lbmFibGUtc291cmNlLW1hcHMgc2VydmVyL2Rpc3Qvc2VydmVyL3NyYy9zZXJ2ZXIuanNcIixcbiAgICBcIm1vZGVyYXRpb25cIjogXCJub2RlIC0tZW5hYmxlLXNvdXJjZS1tYXBzIHNlcnZlci9kaXN0L3NlcnZlci9zcmMvbW9kZXJhdGlvbi5qc1wiLFxuICAgIFwid2FyblwiOiBcInBucG0gbW9kZXJhdGlvbiB3YXJuXCIsXG4gICAgXCJiYW5cIjogXCJwbnBtIG1vZGVyYXRpb24gYmFuXCIsXG4gICAgXCJ1bmJhblwiOiBcInBucG0gbW9kZXJhdGlvbiB1bmJhblwiLFxuICAgIFwiZGV2XCI6IFwicG5wbSAtciBkZXZcIixcbiAgICBcImRldjpjbGllbnRcIjogXCJjZCBjbGllbnQgJiYgcG5wbSBkZXZcIixcbiAgICBcImRldjpzZXJ2ZXJcIjogXCJjZCBzZXJ2ZXIgJiYgcG5wbSBkZXZcIixcbiAgICBcImRldjp0ZXN0XCI6IFwiY2QgdGVzdHMgJiYgcG5wbSBzdHJlc3NUZXN0XCIsXG4gICAgXCJsaW50XCI6IFwiZXNsaW50IC4gLS1maXggLS1leHQgLmpzLC50c1wiLFxuICAgIFwibGludDpjaVwiOiBcImVzbGludCAuIC0tbWF4LXdhcm5pbmdzIDAgLS1leHQgLmpzLC50c1wiLFxuICAgIFwidmFsaWRhdGVEZWZpbml0aW9uc1wiOiBcImNkIHRlc3RzICYmIHRzYyAmJiBwbnBtIHZhbGlkYXRlRGVmaW5pdGlvbnNcIixcbiAgICBcImZ1bGwtcmVpbnN0YWxsXCI6IFwicm0gLXIgbm9kZV9tb2R1bGVzIHBucG0tbG9jay55YW1sIGNsaWVudC9ub2RlX21vZHVsZXMgc2VydmVyL25vZGVfbW9kdWxlcyBjb21tb24vbm9kZV9tb2R1bGVzIHRlc3RzL25vZGVfbW9kdWxlcyAmJiBwbnBtIGluc3RhbGxcIlxuICB9LFxuICBcImVuZ2luZXNcIjoge1xuICAgIFwibm9kZVwiOiBcIj49MTguOC4wXCIsXG4gICAgXCJwbnBtXCI6IFwiPj04LjAuMFwiXG4gIH0sXG4gIFwia2V5d29yZHNcIjogW1xuICAgIFwibm9kZWpzXCIsXG4gICAgXCJ0eXBlc2NyaXB0XCJcbiAgXSxcbiAgXCJsaWNlbnNlXCI6IFwiR1BMLTMuMFwiLFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAdHlwZXNjcmlwdC1lc2xpbnQvZXNsaW50LXBsdWdpblwiOiBcIl43LjUuMFwiLFxuICAgIFwiQHR5cGVzY3JpcHQtZXNsaW50L3BhcnNlclwiOiBcIl43LjUuMFwiLFxuICAgIFwiZXNsaW50XCI6IFwiXjguNTcuMFwiLFxuICAgIFwiZXNsaW50LWNvbmZpZy1sb3ZlXCI6IFwiXjQzLjEuMFwiLFxuICAgIFwiZXNsaW50LXBsdWdpbi1pbXBvcnRcIjogXCJeMi4yOS4xXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLW5cIjogXCJeMTYuNi4yXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLXByb21pc2VcIjogXCJeNi4xLjFcIixcbiAgICBcInR5cGVzY3JpcHRcIjogXCJeNS40LjNcIlxuICB9XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL2hlbnJ5L1Byb2dyYW1taW5nL1N1cm9pL2NsaWVudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvaGVucnkvUHJvZ3JhbW1pbmcvU3Vyb2kvY2xpZW50L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2hlbnJ5L1Byb2dyYW1taW5nL1N1cm9pL2NsaWVudC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCBwa2cgZnJvbSBcIi4uL3BhY2thZ2UuanNvblwiO1xuXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuXG5pbXBvcnQgcHJvZENvbmZpZyBmcm9tIFwiLi92aXRlL3ZpdGUucHJvZFwiO1xuaW1wb3J0IGRldkNvbmZpZyBmcm9tIFwiLi92aXRlL3ZpdGUuZGV2XCI7XG5cbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJtU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgZGlybmFtZSwgcmVzb2x2ZSB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSBcInVybFwiO1xuXG5jb25zdCBESVJOQU1FID0gZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IGNvbW1hbmQsIG1vZGUgfSkgPT4ge1xuICAgIC8vIHRlbXBvcmFyeSBoYWNrIHVudGlsIHN2ZWx0ZSByZXdyaXRlXG4gICAgcHJvY2Vzcy5lbnYgPSB7XG4gICAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgICBWSVRFX0FQUF9WRVJTSU9OOiBwa2cudmVyc2lvblxuICAgIH07XG5cbiAgICAvLyBTbyBvdXRwdXQgZGlyZWN0b3J5IGlzbid0IGluY2x1ZGVkICh0aGFua3MgVml0ZSkuXG4gICAgaWYgKGNvbW1hbmQgPT09IFwic2VydmVcIiAmJiBtb2RlID09PSBcImRldmVsb3BtZW50XCIpIHtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMocmVzb2x2ZShESVJOQU1FLCBcIi4vZGlzdFwiKSkpIHsgcm1TeW5jKHJlc29sdmUoRElSTkFNRSwgXCIuL2Rpc3RcIiksIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTsgfVxuICAgIH1cblxuICAgIHJldHVybiBjb21tYW5kID09PSBcInNlcnZlXCIgPyBkZXZDb25maWcgOiBwcm9kQ29uZmlnO1xufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL2hlbnJ5L1Byb2dyYW1taW5nL1N1cm9pL2NsaWVudC92aXRlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jbGllbnQvdml0ZS92aXRlLnByb2QudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvaGVucnkvUHJvZ3JhbW1pbmcvU3Vyb2kvY2xpZW50L3ZpdGUvdml0ZS5wcm9kLnRzXCI7aW1wb3J0IHsgbWVyZ2VDb25maWcsIHR5cGUgVXNlckNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5cbmltcG9ydCBjb21tb24gZnJvbSBcIi4vdml0ZS5jb21tb25cIjtcblxuY29uc3QgY29uZmlnOiBVc2VyQ29uZmlnID0ge1xuICAgIGRlZmluZToge1xuICAgICAgICBBUElfVVJMOiBKU09OLnN0cmluZ2lmeShcIi9hcGlcIilcbiAgICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBtZXJnZUNvbmZpZyhjb21tb24sIGNvbmZpZyk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL2hlbnJ5L1Byb2dyYW1taW5nL1N1cm9pL2NsaWVudC92aXRlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jbGllbnQvdml0ZS92aXRlLmNvbW1vbi50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jbGllbnQvdml0ZS92aXRlLmNvbW1vbi50c1wiO2ltcG9ydCBwa2cgZnJvbSBcIi4uLy4uL3BhY2thZ2UuanNvblwiO1xuXG5pbXBvcnQgeyBzcGxpdFZlbmRvckNodW5rUGx1Z2luLCB0eXBlIFVzZXJDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgVml0ZUltYWdlT3B0aW1pemVyIH0gZnJvbSBcInZpdGUtcGx1Z2luLWltYWdlLW9wdGltaXplclwiO1xuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSBcIkBzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGVcIjtcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgc3ByaXRlc2hlZXQgfSBmcm9tIFwiLi92aXRlLXNwcml0ZXNoZWV0LXBsdWdpbi9zcHJpdGVzaGVldC1wbHVnaW5cIjtcblxuY29uc3QgY29uZmlnOiBVc2VyQ29uZmlnID0ge1xuICAgIGJ1aWxkOiB7XG4gICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vaW5kZXguaHRtbFwiKSxcbiAgICAgICAgICAgICAgICBjaGFuZ2Vsb2c6IHJlc29sdmUoX19kaXJuYW1lLCBcIi4uL2NoYW5nZWxvZy9pbmRleC5odG1sXCIpLFxuICAgICAgICAgICAgICAgIG5ld3M6IHJlc29sdmUoX19kaXJuYW1lLCBcIi4uL25ld3MvaW5kZXguaHRtbFwiKSxcbiAgICAgICAgICAgICAgICBydWxlczogcmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vcnVsZXMvaW5kZXguaHRtbFwiKSxcbiAgICAgICAgICAgICAgICBlZGl0b3I6IHJlc29sdmUoX19kaXJuYW1lLCBcIi4uL2VkaXRvci9pbmRleC5odG1sXCIpLFxuICAgICAgICAgICAgICAgIHdpa2k6IHJlc29sdmUoX19kaXJuYW1lLCBcIi4uL3dpa2kvaW5kZXguaHRtbFwiKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHBsdWdpbnM6IFtcbiAgICAgICAgc3ZlbHRlKCksXG4gICAgICAgIHNwbGl0VmVuZG9yQ2h1bmtQbHVnaW4oKSxcbiAgICAgICAgVml0ZUltYWdlT3B0aW1pemVyKHtcbiAgICAgICAgICAgIHRlc3Q6IC9cXC4oc3ZnKSQvaSxcbiAgICAgICAgICAgIGxvZ1N0YXRzOiBmYWxzZVxuICAgICAgICB9KSxcbiAgICAgICAgc3ByaXRlc2hlZXQoKVxuICAgIF0sXG5cbiAgICBkZWZpbmU6IHtcbiAgICAgICAgQVBQX1ZFUlNJT046IEpTT04uc3RyaW5naWZ5KGAke3BrZy52ZXJzaW9ufWApXG4gICAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgY29uZmlnO1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jbGllbnQvdml0ZS92aXRlLXNwcml0ZXNoZWV0LXBsdWdpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvaGVucnkvUHJvZ3JhbW1pbmcvU3Vyb2kvY2xpZW50L3ZpdGUvdml0ZS1zcHJpdGVzaGVldC1wbHVnaW4vc3ByaXRlc2hlZXQtcGx1Z2luLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2hlbnJ5L1Byb2dyYW1taW5nL1N1cm9pL2NsaWVudC92aXRlL3ZpdGUtc3ByaXRlc2hlZXQtcGx1Z2luL3Nwcml0ZXNoZWV0LXBsdWdpbi50c1wiO2ltcG9ydCB0eXBlIHsgRlNXYXRjaGVyLCBQbHVnaW4sIFJlc29sdmVkQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCB7IHdhdGNoIH0gZnJvbSBcImNob2tpZGFyXCI7XG5pbXBvcnQgeyBNaW5pbWF0Y2ggfSBmcm9tIFwibWluaW1hdGNoXCI7XG5cbmltcG9ydCByZWFkRGlyZWN0b3J5IGZyb20gXCIuL3V0aWxzL3JlYWREaXJlY3RvcnkuanNcIjtcbmltcG9ydCB7IHR5cGUgQ29tcGlsZXJPcHRpb25zLCBjcmVhdGVTcHJpdGVzaGVldHMsIHR5cGUgbXVsdGlSZXNBdGxhc0xpc3QgfSBmcm9tIFwiLi91dGlscy9zcHJpdGVzaGVldC5qc1wiO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBNb2RlQXRsYXNlcyB9IGZyb20gXCIuLi8uLi8uLi9jb21tb24vc3JjL2RlZmluaXRpb25zL21vZGVzXCI7XG5pbXBvcnQgeyB0eXBlIFNwcml0ZXNoZWV0RGF0YSB9IGZyb20gXCJwaXhpLmpzXCI7XG5cbmNvbnN0IGRlZmF1bHRHbG9iID0gXCIqKi8qLntwbmcsZ2lmLGpwZyxibXAsdGlmZixzdmd9XCI7XG5jb25zdCBpbWFnZXNNYXRjaGVyID0gbmV3IE1pbmltYXRjaChkZWZhdWx0R2xvYik7XG5cbmNvbnN0IFBMVUdJTl9OQU1FID0gXCJ2aXRlLXNwcml0ZXNoZWV0LXBsdWdpblwiO1xuXG5jb25zdCBjb21waWxlck9wdHMgPSB7XG4gICAgb3V0cHV0Rm9ybWF0OiBcInBuZ1wiLFxuICAgIG91dERpcjogXCJhdGxhc2VzXCIsXG4gICAgbWFyZ2luOiA4LFxuICAgIHJlbW92ZUV4dGVuc2lvbnM6IHRydWUsXG4gICAgbWF4aW11bVNpemU6IDQwOTYsXG4gICAgbmFtZTogXCJcIixcbiAgICBwYWNrZXJPcHRpb25zOiB7fVxufSBzYXRpc2ZpZXMgQ29tcGlsZXJPcHRpb25zIGFzIENvbXBpbGVyT3B0aW9ucztcblxuY29uc3QgYXRsYXNlc1RvQnVpbGQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgbWFpbjogXCJwdWJsaWMvaW1nL2dhbWVcIlxufTtcblxuZm9yIChjb25zdCBhdGxhc0lkIG9mIE1vZGVBdGxhc2VzKSB7XG4gICAgYXRsYXNlc1RvQnVpbGRbYXRsYXNJZF0gPSBgcHVibGljL2ltZy9tb2Rlcy8ke2F0bGFzSWR9YDtcbn1cblxuY29uc3QgZm9sZGVyc1RvV2F0Y2ggPSBPYmplY3QudmFsdWVzKGF0bGFzZXNUb0J1aWxkKTtcblxuYXN5bmMgZnVuY3Rpb24gYnVpbGRTcHJpdGVzaGVldHMoKTogUHJvbWlzZTxtdWx0aVJlc0F0bGFzTGlzdD4ge1xuICAgIGNvbnN0IGF0bGFzZXM6IG11bHRpUmVzQXRsYXNMaXN0ID0ge307XG5cbiAgICBmb3IgKGNvbnN0IGF0bGFzSWQgaW4gYXRsYXNlc1RvQnVpbGQpIHtcbiAgICAgICAgY29uc3QgZmlsZXM6IHN0cmluZ1tdID0gcmVhZERpcmVjdG9yeShhdGxhc2VzVG9CdWlsZFthdGxhc0lkXSkuZmlsdGVyKHggPT4gaW1hZ2VzTWF0Y2hlci5tYXRjaCh4KSk7XG4gICAgICAgIGF0bGFzZXNbYXRsYXNJZF0gPSBhd2FpdCBjcmVhdGVTcHJpdGVzaGVldHMoZmlsZXMsIHtcbiAgICAgICAgICAgIC4uLmNvbXBpbGVyT3B0cyxcbiAgICAgICAgICAgIG5hbWU6IGF0bGFzSWRcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGF0bGFzZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcHJpdGVzaGVldCgpOiBQbHVnaW5bXSB7XG4gICAgbGV0IHdhdGNoZXI6IEZTV2F0Y2hlcjtcbiAgICBsZXQgY29uZmlnOiBSZXNvbHZlZENvbmZpZztcblxuICAgIGNvbnN0IGhpZ2hSZXNWaXJ0dWFsTW9kdWxlSWQgPSBcInZpcnR1YWw6c3ByaXRlc2hlZXRzLWpzb25zLWhpZ2gtcmVzXCI7XG4gICAgY29uc3QgaGlnaFJlc3Jlc29sdmVkVmlydHVhbE1vZHVsZUlkID0gYFxcMCR7aGlnaFJlc1ZpcnR1YWxNb2R1bGVJZH1gO1xuXG4gICAgY29uc3QgbG93UmVzVmlydHVhbE1vZHVsZUlkID0gXCJ2aXJ0dWFsOnNwcml0ZXNoZWV0cy1qc29ucy1sb3ctcmVzXCI7XG4gICAgY29uc3QgbG93UmVzUmVzb2x2ZWRWaXJ0dWFsTW9kdWxlSWQgPSBgXFwwJHtsb3dSZXNWaXJ0dWFsTW9kdWxlSWR9YDtcblxuICAgIGxldCBhdGxhc2VzOiBtdWx0aVJlc0F0bGFzTGlzdCA9IHt9O1xuXG4gICAgY29uc3QgZXhwb3J0ZWRBdGxhc2VzOiB7XG4gICAgICAgIGxvdzogUmVjb3JkPHN0cmluZywgU3ByaXRlc2hlZXREYXRhW10+XG4gICAgICAgIGhpZ2g6IFJlY29yZDxzdHJpbmcsIFNwcml0ZXNoZWV0RGF0YVtdPlxuICAgIH0gPSB7XG4gICAgICAgIGxvdzoge30sXG4gICAgICAgIGhpZ2g6IHt9XG4gICAgfTtcblxuICAgIGxldCBidWlsZFRpbWVvdXQ6IE5vZGVKUy5UaW1lb3V0IHwgdW5kZWZpbmVkO1xuXG4gICAgcmV0dXJuIFtcbiAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogYCR7UExVR0lOX05BTUV9OmJ1aWxkYCxcbiAgICAgICAgICAgIGFwcGx5OiBcImJ1aWxkXCIsXG4gICAgICAgICAgICBhc3luYyBidWlsZFN0YXJ0KCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5mbyhcIkJ1aWxkaW5nIHNwcml0ZXNoZWV0c1wiKTtcbiAgICAgICAgICAgICAgICBhdGxhc2VzID0gYXdhaXQgYnVpbGRTcHJpdGVzaGVldHMoKTtcblxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYXRsYXNJZCBpbiBhdGxhc2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydGVkQXRsYXNlcy5oaWdoW2F0bGFzSWRdID0gYXRsYXNlc1thdGxhc0lkXS5oaWdoLm1hcChzaGVldCA9PiBzaGVldC5qc29uKTtcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0ZWRBdGxhc2VzLmxvd1thdGxhc0lkXSA9IGF0bGFzZXNbYXRsYXNJZF0ubG93Lm1hcChzaGVldCA9PiBzaGVldC5qc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2VuZXJhdGVCdW5kbGUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhdGxhc0lkIGluIGF0bGFzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2hlZXRzID0gYXRsYXNlc1thdGxhc0lkXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzaGVldCBvZiBbLi4uc2hlZXRzLmxvdywgLi4uc2hlZXRzLmhpZ2hdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRGaWxlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImFzc2V0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWU6IHNoZWV0Lmpzb24ubWV0YS5pbWFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHNoZWV0LmltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5mbyhgQnVpbHQgc3ByaXRlc2hlZXQgJHtzaGVldC5qc29uLm1ldGEuaW1hZ2V9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzb2x2ZUlkKGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlkID09PSBoaWdoUmVzVmlydHVhbE1vZHVsZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoaWdoUmVzcmVzb2x2ZWRWaXJ0dWFsTW9kdWxlSWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpZCA9PT0gbG93UmVzVmlydHVhbE1vZHVsZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsb3dSZXNSZXNvbHZlZFZpcnR1YWxNb2R1bGVJZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9hZChpZCkge1xuICAgICAgICAgICAgICAgIGlmIChpZCA9PT0gaGlnaFJlc3Jlc29sdmVkVmlydHVhbE1vZHVsZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgZXhwb3J0IGNvbnN0IGF0bGFzZXMgPSBKU09OLnBhcnNlKCcke0pTT04uc3RyaW5naWZ5KGV4cG9ydGVkQXRsYXNlcy5oaWdoKX0nKWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpZCA9PT0gbG93UmVzUmVzb2x2ZWRWaXJ0dWFsTW9kdWxlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBleHBvcnQgY29uc3QgYXRsYXNlcyA9IEpTT04ucGFyc2UoJyR7SlNPTi5zdHJpbmdpZnkoZXhwb3J0ZWRBdGxhc2VzLmxvdyl9JylgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogYCR7UExVR0lOX05BTUV9OnNlcnZlYCxcbiAgICAgICAgICAgIGFwcGx5OiBcInNlcnZlXCIsXG4gICAgICAgICAgICBjb25maWdSZXNvbHZlZChjZmcpIHtcbiAgICAgICAgICAgICAgICBjb25maWcgPSBjZmc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXN5bmMgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbG9hZFBhZ2UoKTogdm9pZCB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChidWlsZFRpbWVvdXQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGJ1aWxkVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnLmxvZ2dlci5pbmZvKFwiUmVidWlsZGluZyBzcHJpdGVzaGVldHNcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkU2hlZXRzKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kdWxlID0gc2VydmVyLm1vZHVsZUdyYXBoLmdldE1vZHVsZUJ5SWQoaGlnaFJlc1ZpcnR1YWxNb2R1bGVJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1vZHVsZSAhPT0gdW5kZWZpbmVkKSB2b2lkIHNlcnZlci5yZWxvYWRNb2R1bGUobW9kdWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2R1bGUyID0gc2VydmVyLm1vZHVsZUdyYXBoLmdldE1vZHVsZUJ5SWQobG93UmVzVmlydHVhbE1vZHVsZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9kdWxlMiAhPT0gdW5kZWZpbmVkKSB2b2lkIHNlcnZlci5yZWxvYWRNb2R1bGUobW9kdWxlMik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChjb25zb2xlLmVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3YXRjaGVyID0gd2F0Y2goZm9sZGVyc1RvV2F0Y2gubWFwKHBhdHRlcm4gPT4gcmVzb2x2ZShwYXR0ZXJuLCBkZWZhdWx0R2xvYikpLCB7XG4gICAgICAgICAgICAgICAgICAgIGN3ZDogY29uZmlnLnJvb3QsXG4gICAgICAgICAgICAgICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJhZGRcIiwgcmVsb2FkUGFnZSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwiY2hhbmdlXCIsIHJlbG9hZFBhZ2UpXG4gICAgICAgICAgICAgICAgICAgIC5vbihcInVubGlua1wiLCByZWxvYWRQYWdlKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gbmV3IE1hcDxzdHJpbmcsIEJ1ZmZlciB8IHN0cmluZz4oKTtcblxuICAgICAgICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIGJ1aWxkU2hlZXRzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAgICAgICAgICAgICBhdGxhc2VzID0gYXdhaXQgYnVpbGRTcHJpdGVzaGVldHMoKTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGF0bGFzSWQgaW4gYXRsYXNlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0ZWRBdGxhc2VzLmhpZ2hbYXRsYXNJZF0gPSBhdGxhc2VzW2F0bGFzSWRdLmhpZ2gubWFwKHNoZWV0ID0+IHNoZWV0Lmpzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0ZWRBdGxhc2VzLmxvd1thdGxhc0lkXSA9IGF0bGFzZXNbYXRsYXNJZF0ubG93Lm1hcChzaGVldCA9PiBzaGVldC5qc29uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZpbGVzLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYXRsYXNJZCBpbiBhdGxhc2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzaGVldHMgPSBhdGxhc2VzW2F0bGFzSWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzaGVldCBvZiBbLi4uc2hlZXRzLmxvdywgLi4uc2hlZXRzLmhpZ2hdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMuc2V0KHNoZWV0Lmpzb24ubWV0YS5pbWFnZSEsIHNoZWV0LmltYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhd2FpdCBidWlsZFNoZWV0cygpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXEub3JpZ2luYWxVcmwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIG5leHQoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVzLmdldChyZXEub3JpZ2luYWxVcmwuc2xpY2UoMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIG5leHQoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBgaW1hZ2UvJHtjb21waWxlck9wdHMub3V0cHV0Rm9ybWF0fWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsb3NlQnVuZGxlOiBhc3luYygpID0+IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB3YXRjaGVyLmNsb3NlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzb2x2ZUlkKGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlkID09PSBoaWdoUmVzVmlydHVhbE1vZHVsZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoaWdoUmVzcmVzb2x2ZWRWaXJ0dWFsTW9kdWxlSWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpZCA9PT0gbG93UmVzVmlydHVhbE1vZHVsZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsb3dSZXNSZXNvbHZlZFZpcnR1YWxNb2R1bGVJZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9hZChpZCkge1xuICAgICAgICAgICAgICAgIGlmIChpZCA9PT0gaGlnaFJlc3Jlc29sdmVkVmlydHVhbE1vZHVsZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgZXhwb3J0IGNvbnN0IGF0bGFzZXMgPSBKU09OLnBhcnNlKCcke0pTT04uc3RyaW5naWZ5KGV4cG9ydGVkQXRsYXNlcy5oaWdoKX0nKWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpZCA9PT0gbG93UmVzUmVzb2x2ZWRWaXJ0dWFsTW9kdWxlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBleHBvcnQgY29uc3QgYXRsYXNlcyA9IEpTT04ucGFyc2UoJyR7SlNPTi5zdHJpbmdpZnkoZXhwb3J0ZWRBdGxhc2VzLmxvdyl9JylgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF07XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL2hlbnJ5L1Byb2dyYW1taW5nL1N1cm9pL2NsaWVudC92aXRlL3ZpdGUtc3ByaXRlc2hlZXQtcGx1Z2luL3V0aWxzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jbGllbnQvdml0ZS92aXRlLXNwcml0ZXNoZWV0LXBsdWdpbi91dGlscy9yZWFkRGlyZWN0b3J5LnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2hlbnJ5L1Byb2dyYW1taW5nL1N1cm9pL2NsaWVudC92aXRlL3ZpdGUtc3ByaXRlc2hlZXQtcGx1Z2luL3V0aWxzL3JlYWREaXJlY3RvcnkudHNcIjtpbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcblxuLyoqXG4gKiBSZWN1cnNpdmVseSByZWFkIGEgZGlyZWN0b3J5LlxuICogQHBhcmFtIGRpciBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5LlxuICogQHJldHVybnMgQW4gYXJyYXkgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRpcmVjdG9yeSdzIGNvbnRlbnRzLlxuICovXG5jb25zdCByZWFkRGlyZWN0b3J5ID0gKGRpcjogc3RyaW5nKTogc3RyaW5nW10gPT4ge1xuICAgIGxldCByZXN1bHRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmMoZGlyKTtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGgucmVzb2x2ZShkaXIsIGZpbGUpO1xuICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZmlsZVBhdGgpO1xuXG4gICAgICAgIGlmIChzdGF0Py5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSByZWFkRGlyZWN0b3J5KGZpbGVQYXRoKTtcbiAgICAgICAgICAgIHJlc3VsdHMgPSByZXN1bHRzLmNvbmNhdChyZXMpO1xuICAgICAgICB9IGVsc2UgcmVzdWx0cy5wdXNoKGZpbGVQYXRoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHJlYWREaXJlY3Rvcnk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL2hlbnJ5L1Byb2dyYW1taW5nL1N1cm9pL2NsaWVudC92aXRlL3ZpdGUtc3ByaXRlc2hlZXQtcGx1Z2luL3V0aWxzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jbGllbnQvdml0ZS92aXRlLXNwcml0ZXNoZWV0LXBsdWdpbi91dGlscy9zcHJpdGVzaGVldC50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jbGllbnQvdml0ZS92aXRlLXNwcml0ZXNoZWV0LXBsdWdpbi91dGlscy9zcHJpdGVzaGVldC50c1wiO2ltcG9ydCB7IHBsYXRmb3JtIH0gZnJvbSBcIm9zXCI7XG5pbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSBcImNyeXB0b1wiO1xuXG5pbXBvcnQgeyB0eXBlIElPcHRpb24sIE1heFJlY3RzUGFja2VyIH0gZnJvbSBcIm1heHJlY3RzLXBhY2tlclwiO1xuaW1wb3J0IHsgdHlwZSBJbWFnZSwgY3JlYXRlQ2FudmFzLCBsb2FkSW1hZ2UgfSBmcm9tIFwiY2FudmFzXCI7XG5pbXBvcnQgeyB0eXBlIFNwcml0ZXNoZWV0RGF0YSB9IGZyb20gXCJwaXhpLmpzXCI7XG5cbmV4cG9ydCBjb25zdCBzdXBwb3J0ZWRGb3JtYXRzID0gW1wicG5nXCIsIFwianBlZ1wiXSBhcyBjb25zdDtcblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlck9wdGlvbnMge1xuICAgIC8qKlxuICAgICogRm9ybWF0IG9mIHRoZSBvdXRwdXQgaW1hZ2VcbiAgICAqIEBkZWZhdWx0IFwicG5nXCJcbiAgICAqL1xuICAgIG91dHB1dEZvcm1hdDogdHlwZW9mIHN1cHBvcnRlZEZvcm1hdHNbbnVtYmVyXVxuXG4gICAgLyoqXG4gICAgICogT3V0cHV0IGRpcmVjdG9yeVxuICAgICAqIEBkZWZhdWx0IFwiYXRsYXNlc1wiXG4gICAgICovXG4gICAgb3V0RGlyOiBzdHJpbmdcblxuICAgIG5hbWU6IHN0cmluZ1xuXG4gICAgLyoqXG4gICAgKiBBZGRlZCBwaXhlbHMgYmV0d2VlbiBzcHJpdGVzIChjYW4gcHJldmVudCBwaXhlbHMgbGVha2luZyB0byBhZGphY2VudCBzcHJpdGUpXG4gICAgKiBAZGVmYXVsdCAxXG4gICAgKi9cbiAgICBtYXJnaW46IG51bWJlclxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGZpbGUgZXh0ZW5zaW9ucyBmcm9tIHRoZSBhdGxhcyBmcmFtZXNcbiAgICAgKiBAZGVmYXVsdCB0cnVlXG4gICAgICovXG4gICAgcmVtb3ZlRXh0ZW5zaW9uczogYm9vbGVhblxuXG4gICAgLyoqXG4gICAgKiBUaGUgTWF4aW11bSB3aWR0aCBhbmQgaGVpZ2h0IGEgZ2VuZXJhdGVkIGltYWdlIGNhbiBiZVxuICAgICogT25jZSBhIHNwcml0ZXNoZWV0IGV4Y2VlZHMgdGhpcyBzaXplIGEgbmV3IG9uZSB3aWxsIGJlIGNyZWF0ZWRcbiAgICAqIEBkZWZhdWx0IDQwOTZcbiAgICAqL1xuICAgIG1heGltdW1TaXplOiBudW1iZXJcblxuICAgIC8qKlxuICAgICAqIG1heHJlY3RzLXBhY2tlciBvcHRpb25zXG4gICAgICogU2VlIGh0dHBzOi8vc29pbXkuZ2l0aHViLmlvL21heHJlY3RzLXBhY2tlci9cbiAgICAgKiBDdXJyZW50bHkgZG9lcyBub3Qgc3VwcG9ydCBgYWxsb3dSb3RhdGlvbmAgb3B0aW9uXG4gICAgICovXG4gICAgcGFja2VyT3B0aW9uczogT21pdDxJT3B0aW9uLCBcImFsbG93Um90YXRpb25cIj5cbn1cblxuZXhwb3J0IHR5cGUgQXRsYXNMaXN0ID0gQXJyYXk8eyBqc29uOiBTcHJpdGVzaGVldERhdGEsIGltYWdlOiBCdWZmZXIgfT47XG5cbmV4cG9ydCB0eXBlIG11bHRpUmVzQXRsYXNMaXN0ID0gUmVjb3JkPHN0cmluZywge1xuICAgIGxvdzogQXRsYXNMaXN0XG4gICAgaGlnaDogQXRsYXNMaXN0XG59PjtcblxuLyoqXG4gKiBQYWNrIGltYWdlcyBzcHJpdGVzaGVldHMuXG4gKiBAcGFyYW0gcGF0aHMgTGlzdCBvZiBwYXRocyB0byB0aGUgaW1hZ2VzLlxuICogQHBhcmFtIG9wdGlvbnMgT3B0aW9ucyBwYXNzZWQgdG8gdGhlIHBhY2tlci5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVNwcml0ZXNoZWV0cyhwYXRoczogc3RyaW5nW10sIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IFByb21pc2U8eyBsb3c6IEF0bGFzTGlzdCwgaGlnaDogQXRsYXNMaXN0IH0+IHtcbiAgICBpZiAocGF0aHMubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoXCJObyBmaWxlIGdpdmVuLlwiKTtcblxuICAgIGlmICghc3VwcG9ydGVkRm9ybWF0cy5pbmNsdWRlcyhvcHRpb25zLm91dHB1dEZvcm1hdCkpIHtcbiAgICAgICAgY29uc3Qgc3VwcG9ydGVkID0gSlNPTi5zdHJpbmdpZnkoc3VwcG9ydGVkRm9ybWF0cyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgb3V0cHV0Rm9ybWF0IHNob3VsZCBvbmx5IGJlIG9uZSBvZiAke3N1cHBvcnRlZH0sIGJ1dCBcIiR7b3B0aW9ucy5vdXRwdXRGb3JtYXR9XCIgd2FzIGdpdmVuLmApO1xuICAgIH1cblxuICAgIGludGVyZmFjZSBQYWNrZXJSZWN0RGF0YSB7XG4gICAgICAgIGltYWdlOiBJbWFnZVxuICAgICAgICBwYXRoOiBzdHJpbmdcbiAgICB9XG5cbiAgICBjb25zdCBpbWFnZXM6IFBhY2tlclJlY3REYXRhW10gPSBbXTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKHBhdGhzLm1hcChhc3luYyBwYXRoID0+IHtcbiAgICAgICAgY29uc3QgaW1hZ2UgPSBhd2FpdCBsb2FkSW1hZ2UocGF0aCk7XG4gICAgICAgIGltYWdlcy5wdXNoKHtcbiAgICAgICAgICAgIGltYWdlLFxuICAgICAgICAgICAgcGF0aFxuICAgICAgICB9KTtcbiAgICB9KSk7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVTaGVldChyZXNvbHV0aW9uOiBudW1iZXIpOiBBdGxhc0xpc3Qge1xuICAgICAgICBjb25zdCBwYWNrZXIgPSBuZXcgTWF4UmVjdHNQYWNrZXIoXG4gICAgICAgICAgICBvcHRpb25zLm1heGltdW1TaXplICogcmVzb2x1dGlvbixcbiAgICAgICAgICAgIG9wdGlvbnMubWF4aW11bVNpemUgKiByZXNvbHV0aW9uLFxuICAgICAgICAgICAgb3B0aW9ucy5tYXJnaW4sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLi4ub3B0aW9ucy5wYWNrZXJPcHRpb25zLFxuICAgICAgICAgICAgICAgIGFsbG93Um90YXRpb246IGZhbHNlIC8vIFRPRE86IHN1cHBvcnQgcm90YXRpbmcgZnJhbWVzXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgZm9yIChjb25zdCBpbWFnZSBvZiBpbWFnZXMpIHtcbiAgICAgICAgICAgIHBhY2tlci5hZGQoXG4gICAgICAgICAgICAgICAgaW1hZ2UuaW1hZ2Uud2lkdGggKiByZXNvbHV0aW9uLFxuICAgICAgICAgICAgICAgIGltYWdlLmltYWdlLmhlaWdodCAqIHJlc29sdXRpb24sXG4gICAgICAgICAgICAgICAgaW1hZ2VcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhdGxhc2VzOiBBdGxhc0xpc3QgPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGJpbiBvZiBwYWNrZXIuYmlucykge1xuICAgICAgICAgICAgY29uc3QgY2FudmFzID0gY3JlYXRlQ2FudmFzKGJpbi53aWR0aCwgYmluLmhlaWdodCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cbiAgICAgICAgICAgIGNvbnN0IGpzb246IFNwcml0ZXNoZWV0RGF0YSA9IHtcbiAgICAgICAgICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGltYWdlOiBcIlwiLFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogcmVzb2x1dGlvbixcbiAgICAgICAgICAgICAgICAgICAgc2l6ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdzogYmluLndpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaDogYmluLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmcmFtZXM6IHt9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJlY3Qgb2YgYmluLnJlY3RzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YTogUGFja2VyUmVjdERhdGEgPSByZWN0LmRhdGE7XG5cbiAgICAgICAgICAgICAgICBjdHguZHJhd0ltYWdlKGRhdGEuaW1hZ2UsIHJlY3QueCwgcmVjdC55LCByZWN0LndpZHRoLCByZWN0LmhlaWdodCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2VQYXJ0cyA9IChyZWN0LmRhdGEucGF0aCBhcyBzdHJpbmcpLnNwbGl0KHBsYXRmb3JtKCkgPT09IFwid2luMzJcIiA/IFwiXFxcXFwiIDogXCIvXCIpO1xuICAgICAgICAgICAgICAgIGxldCBuYW1lID0gc291cmNlUGFydHMuc2xpY2Uoc291cmNlUGFydHMubGVuZ3RoIC0gMSwgc291cmNlUGFydHMubGVuZ3RoKS5qb2luKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5yZW1vdmVFeHRlbnNpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXAgPSBuYW1lLnNwbGl0KFwiLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgdGVtcC5zcGxpY2UodGVtcC5sZW5ndGggLSAxLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IHRlbXAuam9pbigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGpzb24uZnJhbWVzW25hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICBmcmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdzogcmVjdC53aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGg6IHJlY3QuaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgeDogcmVjdC54LFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogcmVjdC55XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZVNpemU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHc6IHJlY3Qud2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBoOiByZWN0LmhlaWdodFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gY2FudmFzLnRvQnVmZmVyKGBpbWFnZS8ke29wdGlvbnMub3V0cHV0Rm9ybWF0fWAgYXMgXCJpbWFnZS9wbmdcIik7XG5cbiAgICAgICAgICAgIGNvbnN0IGhhc2ggPSBjcmVhdGVIYXNoKFwic2hhMVwiKTtcbiAgICAgICAgICAgIGhhc2guc2V0RW5jb2RpbmcoXCJoZXhcIik7XG4gICAgICAgICAgICBoYXNoLndyaXRlKGJ1ZmZlcik7XG4gICAgICAgICAgICBoYXNoLmVuZCgpO1xuICAgICAgICAgICAgY29uc3Qgc2hhMSA9IChoYXNoLnJlYWQoKSBhcyBzdHJpbmcpLnNsaWNlKDAsIDgpO1xuXG4gICAgICAgICAgICBqc29uLm1ldGEuaW1hZ2UgPSBgJHtvcHRpb25zLm91dERpcn0vJHtvcHRpb25zLm5hbWV9LSR7c2hhMX1AJHtyZXNvbHV0aW9ufXguJHtvcHRpb25zLm91dHB1dEZvcm1hdH1gO1xuXG4gICAgICAgICAgICBhdGxhc2VzLnB1c2goe1xuICAgICAgICAgICAgICAgIGpzb24sXG4gICAgICAgICAgICAgICAgaW1hZ2U6IGJ1ZmZlclxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXRsYXNlcztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBsb3c6IGNyZWF0ZVNoZWV0KDAuNSksXG4gICAgICAgIGhpZ2g6IGNyZWF0ZVNoZWV0KDEpXG4gICAgfTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvaGVucnkvUHJvZ3JhbW1pbmcvU3Vyb2kvY29tbW9uL3NyYy9kZWZpbml0aW9uc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvaGVucnkvUHJvZ3JhbW1pbmcvU3Vyb2kvY29tbW9uL3NyYy9kZWZpbml0aW9ucy9tb2Rlcy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jb21tb24vc3JjL2RlZmluaXRpb25zL21vZGVzLnRzXCI7ZXhwb3J0IHR5cGUgQ29sb3JLZXlzID0gXCJncmFzc1wiIHwgXCJ3YXRlclwiIHwgXCJib3JkZXJcIiB8IFwiYmVhY2hcIiB8IFwicml2ZXJCYW5rXCIgfCBcImdhc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1vZGVEZWZpbml0aW9uIHtcbiAgICByZWFkb25seSBpZFN0cmluZzogc3RyaW5nXG4gICAgcmVhZG9ubHkgY29sb3JzOiBSZWNvcmQ8Q29sb3JLZXlzLCBzdHJpbmc+XG4gICAgcmVhZG9ubHkgc3BlY2lhbE1lbnVNdXNpYz86IGJvb2xlYW5cbiAgICByZWFkb25seSByZXNraW4/OiBzdHJpbmdcbiAgICAvLyB3aWxsIGJlIG11bHRpcGxpZWQgYnkgdGhlIGJ1bGxldCB0cmFpbCBjb2xvclxuICAgIHJlYWRvbmx5IGJ1bGxldFRyYWlsQWRqdXN0Pzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVza2luRGVmaW5pdGlvbiB7XG4gICAgcmVhZG9ubHkgc291bmRzPzogc3RyaW5nW11cbn1cblxuZXhwb3J0IGNvbnN0IE1vZGVzOiBNb2RlRGVmaW5pdGlvbltdID0gW1xuICAgIHtcbiAgICAgICAgaWRTdHJpbmc6IFwibm9ybWFsXCIsXG4gICAgICAgIGNvbG9yczoge1xuICAgICAgICAgICAgZ3Jhc3M6IFwiaHNsKDExMywgNDIlLCA0MiUpXCIsXG4gICAgICAgICAgICB3YXRlcjogXCJoc2woMjExLCA2MyUsIDQyJSlcIixcbiAgICAgICAgICAgIGJvcmRlcjogXCJoc2woMjExLCA2MyUsIDMwJSlcIixcbiAgICAgICAgICAgIGJlYWNoOiBcImhzbCg0MCwgMzklLCA1NSUpXCIsXG4gICAgICAgICAgICByaXZlckJhbms6IFwiaHNsKDMzLCA1MCUsIDMwJSlcIixcbiAgICAgICAgICAgIGdhczogXCJoc2xhKDE3LCAxMDAlLCA1MCUsIDAuNTUpXCJcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBpZFN0cmluZzogXCJoYWxsb3dlZW5cIixcbiAgICAgICAgY29sb3JzOiB7XG4gICAgICAgICAgICBncmFzczogXCJoc2woNjUsIDEwMCUsIDEyJSlcIixcbiAgICAgICAgICAgIHdhdGVyOiBcImhzbCg0LCAxMDAlLCAxNCUpXCIsXG4gICAgICAgICAgICBib3JkZXI6IFwiaHNsKDQsIDkwJSwgMTIlKVwiLFxuICAgICAgICAgICAgYmVhY2g6IFwiaHNsKDMzLCA3NyUsIDIxJSlcIixcbiAgICAgICAgICAgIHJpdmVyQmFuazogXCJoc2woMzMsIDUwJSwgMzAlKVwiLFxuICAgICAgICAgICAgZ2FzOiBcImhzbGEoMTcsIDEwMCUsIDUwJSwgMC41NSlcIlxuICAgICAgICB9LFxuICAgICAgICBzcGVjaWFsTWVudU11c2ljOiB0cnVlLFxuICAgICAgICByZXNraW46IFwiZmFsbFwiXG4gICAgfSxcbiAgICB7XG4gICAgICAgIGlkU3RyaW5nOiBcImZhbGxcIixcbiAgICAgICAgY29sb3JzOiB7XG4gICAgICAgICAgICBncmFzczogXCJoc2woMTEzLCA0MiUsIDQyJSlcIixcbiAgICAgICAgICAgIHdhdGVyOiBcImhzbCgyMTEsIDYzJSwgNDIlKVwiLFxuICAgICAgICAgICAgYm9yZGVyOiBcImhzbCgyMTEsIDYzJSwgMzAlKVwiLFxuICAgICAgICAgICAgYmVhY2g6IFwiaHNsKDQwLCAzOSUsIDU1JSlcIixcbiAgICAgICAgICAgIHJpdmVyQmFuazogXCJoc2woMzMsIDUwJSwgMzAlKVwiLFxuICAgICAgICAgICAgZ2FzOiBcImhzbGEoMTcsIDEwMCUsIDUwJSwgMC41NSlcIlxuICAgICAgICB9LFxuICAgICAgICByZXNraW46IFwiZmFsbFwiXG4gICAgfSxcbiAgICB7XG4gICAgICAgIGlkU3RyaW5nOiBcIndpbnRlclwiLFxuICAgICAgICBjb2xvcnM6IHtcbiAgICAgICAgICAgIGdyYXNzOiBcImhzbCgyMTAsIDE4JSwgODIlKVwiLFxuICAgICAgICAgICAgd2F0ZXI6IFwiaHNsKDIxMSwgNjMlLCA0MiUpXCIsXG4gICAgICAgICAgICBib3JkZXI6IFwiaHNsKDIwOCwgOTQlLCA0NSUpXCIsXG4gICAgICAgICAgICBiZWFjaDogXCJoc2woMjEwLCAxOCUsIDc1JSlcIixcbiAgICAgICAgICAgIHJpdmVyQmFuazogXCJoc2woMjEwLCAxOCUsIDcwJSlcIixcbiAgICAgICAgICAgIGdhczogXCJoc2xhKDE3LCAxMDAlLCA1MCUsIDAuNTUpXCJcbiAgICAgICAgfSxcbiAgICAgICAgc3BlY2lhbE1lbnVNdXNpYzogdHJ1ZSxcbiAgICAgICAgcmVza2luOiBcIndpbnRlclwiLFxuICAgICAgICBidWxsZXRUcmFpbEFkanVzdDogXCJoc2woMCwgNTAlLCA4MCUpXCJcbiAgICB9XG5dO1xuXG5leHBvcnQgY29uc3QgUmVza2luczogUmVjb3JkPHN0cmluZywgUmVza2luRGVmaW5pdGlvbj4gPSB7XG4gICAgd2ludGVyOiB7XG4gICAgICAgIHNvdW5kczogW1xuICAgICAgICAgICAgXCJhaXJkcm9wX3BsYW5lXCJcbiAgICAgICAgXVxuICAgIH1cbn07XG5cbmNvbnN0IHRlbXBMaXN0ID0gTW9kZXNcbiAgICAuZmlsdGVyKG1vZGUgPT4gbW9kZS5yZXNraW4gIT09IHVuZGVmaW5lZClcbiAgICAubWFwKG1vZGUgPT4gbW9kZS5yZXNraW4pO1xuXG5leHBvcnQgY29uc3QgTW9kZUF0bGFzZXMgPSB0ZW1wTGlzdC5maWx0ZXIoKGl0ZW0sIGluZGV4KSA9PiB0ZW1wTGlzdC5pbmRleE9mKGl0ZW0pID09PSBpbmRleCkgYXMgc3RyaW5nW107XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL2hlbnJ5L1Byb2dyYW1taW5nL1N1cm9pL2NsaWVudC92aXRlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jbGllbnQvdml0ZS92aXRlLmRldi50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9oZW5yeS9Qcm9ncmFtbWluZy9TdXJvaS9jbGllbnQvdml0ZS92aXRlLmRldi50c1wiO2ltcG9ydCB7IG1lcmdlQ29uZmlnLCB0eXBlIFVzZXJDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuXG5pbXBvcnQgY29tbW9uIGZyb20gXCIuL3ZpdGUuY29tbW9uXCI7XG5cbmNvbnN0IGNvbmZpZzogVXNlckNvbmZpZyA9IHtcbiAgICBzZXJ2ZXI6IHtcbiAgICAgICAgcG9ydDogMzAwMCxcbiAgICAgICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICAgICAgaG9zdDogXCIwLjAuMC4wXCJcblxuICAgIH0sXG4gICAgcHJldmlldzoge1xuICAgICAgICBwb3J0OiAzMDAwLFxuICAgICAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgICAgICBob3N0OiBcIjAuMC4wLjBcIlxuICAgIH0sXG5cbiAgICBkZWZpbmU6IHtcbiAgICAgICAgQVBJX1VSTDogSlNPTi5zdHJpbmdpZnkoXCJodHRwOi8vbG9jYWxob3N0OjgwODAvYXBpXCIpXG4gICAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgbWVyZ2VDb25maWcoY29tbW9uLCBjb25maWcpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFBO0FBQUEsRUFDRSxNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsRUFDWCxhQUFlO0FBQUEsRUFDZixTQUFXO0FBQUEsRUFDWCxTQUFXO0FBQUEsSUFDVCxPQUFTO0FBQUEsSUFDVCxnQkFBZ0I7QUFBQSxJQUNoQixnQkFBZ0I7QUFBQSxJQUNoQixPQUFTO0FBQUEsSUFDVCxZQUFjO0FBQUEsSUFDZCxNQUFRO0FBQUEsSUFDUixLQUFPO0FBQUEsSUFDUCxPQUFTO0FBQUEsSUFDVCxLQUFPO0FBQUEsSUFDUCxjQUFjO0FBQUEsSUFDZCxjQUFjO0FBQUEsSUFDZCxZQUFZO0FBQUEsSUFDWixNQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxxQkFBdUI7QUFBQSxJQUN2QixrQkFBa0I7QUFBQSxFQUNwQjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsTUFBUTtBQUFBLElBQ1IsTUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLFVBQVk7QUFBQSxJQUNWO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxFQUNYLGlCQUFtQjtBQUFBLElBQ2pCLG9DQUFvQztBQUFBLElBQ3BDLDZCQUE2QjtBQUFBLElBQzdCLFFBQVU7QUFBQSxJQUNWLHNCQUFzQjtBQUFBLElBQ3RCLHdCQUF3QjtBQUFBLElBQ3hCLG1CQUFtQjtBQUFBLElBQ25CLHlCQUF5QjtBQUFBLElBQ3pCLFlBQWM7QUFBQSxFQUNoQjtB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QUFXLHFCQUFxQjtBQUFBLFFBQy9DLFFBQVFBLFNBQVEsa0NBQVcsc0JBQXNCO0FBQUEsUUFDakQsTUFBTUEsU0FBUSxrQ0FBVyxvQkFBb0I7QUFBQSxNQUNqRDtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUEsSUFDUCx1QkFBdUI7QUFBQSxJQUN2QixtQkFBbUI7QUFBQSxNQUNmLE1BQU07QUFBQSxNQUNOLFVBQVU7QUFBQSxJQUNkLENBQUM7QUFBQSxJQUNELFlBQVk7QUFBQSxFQUNoQjtBQUFBLEVBRUEsUUFBUTtBQUFBLElBQ0osYUFBYSxLQUFLLFVBQVUsR0FBRyxnQkFBSSxPQUFPLEVBQUU7QUFBQSxFQUNoRDtBQUNKO0FBRUEsSUFBTyxzQkFBUTs7O0FEakNmLElBQU1DLFVBQXFCO0FBQUEsRUFDdkIsUUFBUTtBQUFBLElBQ0osU0FBUyxLQUFLLFVBQVUsTUFBTTtBQUFBLEVBQ2xDO0FBQ0o7QUFFQSxJQUFPLG9CQUFRLFlBQVkscUJBQVFBLE9BQU07OztBTVY4UCxTQUFTLGVBQUFDLG9CQUFvQztBQUlwVixJQUFNQyxVQUFxQjtBQUFBLEVBQ3ZCLFFBQVE7QUFBQSxJQUNKLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE1BQU07QUFBQSxFQUVWO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixNQUFNO0FBQUEsRUFDVjtBQUFBLEVBRUEsUUFBUTtBQUFBLElBQ0osU0FBUyxLQUFLLFVBQVUsMkJBQTJCO0FBQUEsRUFDdkQ7QUFDSjtBQUVBLElBQU8sbUJBQVFDLGFBQVkscUJBQVFELE9BQU07OztBUGZ6QyxTQUFTLFlBQVksY0FBYztBQUNuQyxTQUFTLFNBQVMsV0FBQUUsZ0JBQWU7QUFDakMsU0FBUyxxQkFBcUI7QUFUa0osSUFBTSwyQ0FBMkM7QUFXak8sSUFBTSxVQUFVLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBQ3RELElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsU0FBUyxLQUFLLE1BQU07QUFFL0MsVUFBUSxNQUFNO0FBQUEsSUFDVixHQUFHLFFBQVE7QUFBQSxJQUNYLGtCQUFrQixnQkFBSTtBQUFBLEVBQzFCO0FBR0EsTUFBSSxZQUFZLFdBQVcsU0FBUyxlQUFlO0FBQy9DLFFBQUksV0FBV0MsU0FBUSxTQUFTLFFBQVEsQ0FBQyxHQUFHO0FBQUUsYUFBT0EsU0FBUSxTQUFTLFFBQVEsR0FBRyxFQUFFLFdBQVcsTUFBTSxPQUFPLEtBQUssQ0FBQztBQUFBLElBQUc7QUFBQSxFQUN4SDtBQUVBLFNBQU8sWUFBWSxVQUFVLG1CQUFZO0FBQzdDLENBQUM7IiwKICAibmFtZXMiOiBbInJlc29sdmUiLCAicGF0aCIsICJyZXNvbHZlIiwgImNvbmZpZyIsICJyZXNvbHZlIiwgInJlc29sdmUiLCAiY29uZmlnIiwgIm1lcmdlQ29uZmlnIiwgImNvbmZpZyIsICJtZXJnZUNvbmZpZyIsICJyZXNvbHZlIiwgInJlc29sdmUiXQp9Cg==
