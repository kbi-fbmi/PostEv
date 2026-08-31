// Deploy-path-agnostic base path this app is served from — e.g. "/posteval/",
// "/", "/whatever/else/". Single source of truth shared by the router
// (src/main.tsx) and anywhere that needs to build a URL to a public/ asset
// by hand (e.g. <img src>, since Vite doesn't rewrite plain string literals
// the way it rewrites `import`ed assets).
//
// NB1: deliberately not `new URL("..", import.meta.url)` — Vite's dev server
// statically special-cases that exact two-arg shape as an asset-URL import
// (https://vite.dev/guide/assets.html#new-url-url-import-meta-url) and
// rewrites the ".." literal to an absolute /@fs/ filesystem path, which
// breaks this at dev time (it works in the production Rollup build, but not
// under `vite dev`). A single-arg `new URL(import.meta.url)` plus a regex
// isn't asset-import syntax, so it's left alone in both.
//
// NB2: this file must live directly under src/, at the same depth as
// main.tsx — NOT in a subfolder (e.g. src/lib/). In prod, every module gets
// bundled into one file under dist/assets/, so it's always exactly one
// level below the deploy root regardless of original source depth. In dev,
// Vite serves each source file as its own unbundled module at its real
// path, so `import.meta.url` here resolves to *this file's own* dev URL —
// if it lived at src/lib/base-path.ts, stripping "one dir + one file" off
// that only unwinds to "/src/", not "/". Keeping this file exactly as deep
// as main.tsx keeps dev and prod computing the same thing.
// The bundler can't (and shouldn't) resolve this statically — runtime
// resolution is the whole point, so silence the build warning.
export const basePath = new URL(/* @vite-ignore */ import.meta.url).pathname.replace(/[^/]+\/[^/]+$/, "");
