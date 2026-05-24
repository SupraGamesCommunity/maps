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

Must be run in root directory of the project.

This will start a server on `http://localhost:5173/`. Visiting that URLin your browser should immediate display
the application with the initial map (SupraLand).

The development server also watches the filesystem for changes, and will automatically reload the application when
you save files. It is typically *not* necessary to hit "Reload" in your browser after saving source files.

You can also run:
```
npx vite  dev --open
```
To run launch the development server and open the URL in your default browser.

If running VS Code there is a launch.json configuration 'Launch Vite Dev Server'


## Running automated tests

To verify that your changes are working correctly, run some simple smoketests:

* `npm run test`: Run tests headlessly (a Chromium browser with no window)
* `npm run test:ui`: Run tests with interactive UI.
* `npm run test:headed`: Run tests in visible browser


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


## Deploying to GitHub Pages

### Publishing to production

The main production app at https://supragamescommunity.github.io/maps/ is hosted via
[GitHub Pages](https://docs.github.com/en/pages). When a branch is merged to the `main` branch in the `maps` repo,
a GitHub Actions workflow will automatically rebuild and publish the site.


### Publishing to your local GitHub Pages

Developers may find it useful to preview changes to their forked repo's GitHub Pages, so that they can (for example)
share work-in-progress with other developers, or facilitate testing the app with mobile browsers. After pushing changes
to a branch on their forked repo:

1. Ensure that you have set up your local repository according to the setup steps in [CONTRIBUTING](./CONTRIBUTING.md).
   This includes forking the upstream repo, and cloning it locally.  

   **Important:** Your `origin` remote should point to your forked repo. To confirm, run `git remote -v` and check
   that `origin` points to something like `https://github.com/YOUR_GITHUB_USERNAME/maps.git`.

2. Ensure your branch passes all tests, lint and format checks.

   ```
   npm run check-all
   bpm run test
   ```

3. Ensure you have the desired branch checked out, with uncommitted/pushed changes.

   ```
   git status -uno
   ```

4. Install GitHub Command Line interface from [cli.github.com](https://cli.github.com/) if not already done

5. If you don't already have github pages (`YOUR_GITHUB_USERNAME.github.io`) setup with the maps you may need to create
it. Instructions can be found here: [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) and here: [Managing environments for deployment](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule).

  To match the maps project environment conifg set _Allow administrators to bypass configured protection rules_ and
  adding `main` to the deployment branches and tags, so that by default only deployments from main branch are allowed.

6. On the forked repository, go to `https://github.com/YOUR_GITHUB_USERNAME/maps/settings/environments_Code`
   (or _Settings=>Code and automation->Environments_) and open the github-pages configuration. Look for
   _Deployment branches and tags_. The main repository and forks normally have `main` as the only branch allowed.
   Add your deployment branch to the rules. See [Managing environments for deployment](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule).

7. Run the deployment script:

   ```
   npm run deploy-gh-pages
   ```

   This will do a build, run all the checks and tests and then, if everything passes, deploy the build to
   your gh-pages site. During the build and deployment it will display progress.

   Alternatively you can trigger the deployment from the Github website. Go to your forked repository then
   _Actions->Deploy Map to Github Pages (github.io)_, click the `Run workflow` button, change the branch to the one
   you want to deploy and select `Run workflow`.

   (URL is https://github.com/YOUR_GITHUB_USERNAME/maps/actions/workflows/deploy.yml)

   Once the job starts, you can click on the build or deploy steps to monitor progress.

8. Once the jobs are successful the branch will be live on `https://YOUR_GITHUB_USERNAME.github.io/maps/`
