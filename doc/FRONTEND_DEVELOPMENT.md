# Front-end development environment

This document describes the front-end development environment, how to set it up, and how use it to develop, build,
and publish the web application.


## Front-end dev tools & libraries used in this project

### Tools

* [Node.js](https://nodejs.org): Local JavaScript execution engine, including the NPM package manager.
* [Vite](https://vite.dev): Frontend build tooling. Transforms and compiles JavaScript, CSS, and other assets into
  a form usable by the browser, provides a local development server with built-in "hot reloading" to instantly see
  results when you save files, and a bundler to create the final assets to publish to a production server.


### Libraries

* [Leaflet](https://leafletjs.com): A library for interactive maps. Many additional plugins are used:
  * [L.Control.FullScreen](https://github.com/brunob/leaflet.fullscreen): Fullscreen button.
  * [L.Control.MousePosition](https://github.com/ardhi/Leaflet.MousePosition): Display mouse XY map position.
  * [L.TileLayer.Canvas](https://github.com/GIAPspzoo/L.TileLayer.Canvas): Use map tile hierarchy.
  * [leaflet-hash](https://github.com/mlevans/leaflet-hash): Dynamic URL hashes to web pages with Leaflet maps (modified).
  * [leaflet-search](https://github.com/stefanocudini/leaflet-search): Search icon.
  * [leaflet.toolbar](https://github.com/Leaflet/Leaflet.toolbar): Flexible, extensible toolbar interfaces.
* [React](https://react.dev): A library for building user interfaces.
* [Prettier](https://prettier.io): Auto-format JavaScript source files.


# Development guide

This section explains how to make changes to the front-end source code.


## One-time setup

This section is a guide to setting up your local front-end development environment. You should only need to do
this once.

1. Install Node JS

Follow [Node's installation guide](https://nodejs.org/en/download).

Note that on MacOS, it may be more convenient to use methods like [Homebrew](https://brew.sh) to install tools,
e.g. with `brew install node`.


2. Install libraries

Run `npm install`. This will download the JavaScript libraries and tools (including the Vite tools framework) into
the local `node_modules/` directory. (This directory is not intended to be committed to the codebase.)


## File structure overview

This section describes where front-end development files are expected to live within the codebase.

```
public/                     Static files. Anythin under this directory is delivered 'as-is' to the browser, and are
                            never modified by the Vite local server. Vite serves this directory as if it was from the
                            server's root `/`.
    js/                     Unmodified JavaScript. This directory is typically used for 3rd-party libraries and/or
                            JavaScript that is not compatible with ES6 modules. It is not optimized by Vite.
    img/                    Images (icons, etc)
    data/                   JSON files describing map elements (Pins, etc).
    tiles/                  Map tile images

web_src/                    JavaScript, CSS, and other web assets. Unlike the public/ directory above, the contents
                            of this directory are transformed by Vite to transpile, minify, and cache source files.
    css/                    CSS style files.

index.html                  The entrypoint HTML of the application.
vite.config.js              Vite configuration file.
eslint.config.js            Configuration for the ESLint tool that builds and lints JavaScript source files.
package.json                NodeJS configuration.
package-lock.json           NPM's resolved list of JavaScript libraries to install.

dist/                       When the production site is built, all front-end assets (HTML, CSS, JavaScript) are placed
                            into this directory for distribution.
node_modules/               Development-only. Stores tools and libraries. Should not be committed to the codebase.

.github/workflows/deploy.yml    GitHub Actions workflow that will automatically build and publish the front-end files
                            to GitHub Pages when a Pull Request is landed on `main`.
```


## Running the development server

After installing Node and running `npm install`, you can start a local development server with:

```
npm run dev
```

This will start a server on `http://localhost:5173/`. Visiting that URLin your browser should immediate display
the application with the initial map (SupraLand).

The development server also watches the filesystem for changes, and will automatically reload the application when
you save files. It is typically *not* necessary to hit "Reload" in your browser after saving source files.


## Building for production

To serve the application on a static site like Github Pages, the source code must be transformed by Vite into static
files.

This process is automatically handled by Github Actions (using a variant of the process described in Vite's
[guide to publishing to static sites](https://vite.dev/guide/static-deploy#github-pages), which is controlled
by the process in `.github/workflows/deploy.yml`.

In short, this process runs `npm run build` to create a `dist/` directory that contains the static web assets.
This directory's contents are intended to be published to the static site server.

A production build is transformed and minimized, and in rare cases this may behave differently from the development
build. To test the production build locally:

```
npm run build       # Install the files into the dist/ directory
npm run preview     # Start a new webserver on https://localhost:4173/ that serves the dist/ directory.
```
