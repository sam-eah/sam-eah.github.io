---
title: 'Deploy Nuxt SSR app to Firebase'
description: ''
pubDate: 'Nov 14, 2019'
heroImage: '/nuxt.jpg'
---

Nuxt app in Universal mode (server side rendering) with Firebase hosting  
Nuxt :

- Vue 2
- Vue Router
- Vuex
- Vue Server Renderer
- vue-meta

## Requirements

- A Firebase project
- npm or yarn

## Setup

(These are the things we will only need to do once.)

### 1. Create Nuxt App

Let's run nuxt cli into our project directory. (In my case I'm using vs code's terminal)

```console
$ npx create-nuxt-app src
npx : 350 installé(s) en 38.369s

create-nuxt-app v2.11.1
✨  Generating Nuxt.js project in src
? Project name nuxt-ssr
? Project description My funkadelic Nuxt.js project
? Author name sam-eah
? Choose the package manager Yarn
? Choose UI framework None
? Choose custom server framework None (Recommended)
? Choose Nuxt.js modules
? Choose linting tools (Press <space> to select, <a> to toggle all, <i> to invert selection)
? Choose test framework None
? Choose rendering mode Universal (SSR)
? Choose development tools jsconfig.json (Recommended for VS Code)

🎉  Successfully created project nuxt-ssr
```

Afterwards, let's make sure dev mode is working

```console
$ yarn --cwd src/ dev
```

_On linux you may have to use `sudo` everytime you use `yarn`._  
Once we made sure everything is fine, we can close the local server (`ctrl + c`)

### 2. Setup Firebase

Install firebase-tools if you haven't already

```console
$ npm i -g firebase-tools
```

Login if you are not connected

```console
$ firebase login
```

Then let's run firebase cli, we will need Functions and Hosting

```console
$ firebase init

     ######## #### ########  ######## ########     ###     ######  ########
     ##        ##  ##     ## ##       ##     ##  ##   ##  ##       ##
     ######    ##  ########  ######   ########  #########  ######  ######
     ##        ##  ##    ##  ##       ##     ## ##     ##       ## ##
     ##       #### ##     ## ######## ########  ##     ##  ######  ########

You're about to initialize a Firebase project in this directory:

  \nuxtssr-firebase

? Are you ready to proceed? Yes
? Which Firebase CLI features do you want to set up for this folder?
Press Space to select features, then Enter to confirm your choices.
Functions: Configure and deploy Cloud Functions,
Hosting: Configure and deploy Firebase Hosting sites

=== Project Setup

First, let's associate this project directory with a Firebase project.
You can create multiple project aliases by running firebase use --add,
but for now we'll just set up a default project.

? Please select an option: Use an existing project
? Select a default Firebase project for this directory: <your firebase project>
i  Using project <your firebase project>

=== Functions Setup

A functions directory will be created in your project with a Node.js
package pre-configured. Functions can be deployed with firebase deploy.

? What language would you like to use to write Cloud Functions? JavaScript
? Do you want to use ESLint to catch probable bugs and enforce style? No
+  Wrote functions/package.json
+  Wrote functions/index.js
+  Wrote functions/.gitignore
? Do you want to install dependencies with npm now? No

=== Hosting Setup

Your public directory is the folder (relative to your project directory) that
will contain Hosting assets to be uploaded with firebase deploy. If you
have a build process for your assets, use your build's output directory.

? What do you want to use as your public directory? public
? Configure as a single-page app (rewrite all urls to /index.html)? No
+  Wrote public/404.html
+  Wrote public/index.html

i  Writing configuration info to firebase.json...
i  Writing project information to .firebaserc...
i  Writing gitignore file to .gitignore...

+  Firebase initialization complete!
```

### 3. Files to modify

These are the files we need to modify

#### `functions/index.js`

First let's write an `index.js` in `/functions`

```js
const functions = require('firebase-functions');
const { Nuxt } = require('nuxt-start');

const config = {
  dev: false, // disable hot reload for cloud functions, always leave to false
  debug: true, // leave true for testing change to false for production
  buildDir: 'nuxt',
};
const nuxt = new Nuxt(config);

exports.nuxtApp = functions.https.onRequest((req, res) =>
  nuxt.render(req, res)
);
```

#### `src/nuxt.config.js`

Change nuxt building directory (the folder where the application is built after running `nuxt build`)

```js
  /*
  ** Build configuration
  */
  buildDir: '../functions/nuxt',
  build: {
    /*
    ** You can extend webpack config here
    */
    extend (config, ctx) {
    }
  }
```

This will build the `/nuxt` directory inside `/functions`

#### `firebase.json`

Add `rewrites` inside `hosting`  
Also add a `predeploy` script to automatically build before every deployment

```json
{
  "hosting": {
    "predeploy": ["yarn --cwd src/ build"],
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "function": "nuxtApp"
      }
    ]
  }
}
```

#### `src/package.json `

Here we just want to modify the build script to automatically copy the static assets into `/public`

- Linux:

```json
"build": "nuxt build && rm -rf ../public/* && cp -R ../functions/nuxt/dist/client ../public && cp -R static/* ../public",
```

- Windows:

```json
"build": "nuxt build && del ..\\public\\* /Q && xcopy ..\\functions\\nuxt\\dist\\client ..\\public\\ /e /y && xcopy static\\* ..\\public\\ /e /y",
```

#### `functions/package.json `

We need to add ALL the packages we have in `src/package.json`  
Simply copy ALL the dependencies and devDependencies from there  
It should look like this afterwards :

```json
{
  "name": "functions",
  "description": "Cloud Functions for Firebase",
  "scripts": {
    "serve": "firebase serve --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "8"
  },
  "dependencies": {
    "firebase-admin": "^8.0.0",
    "firebase-functions": "^3.1.0"
  },
  "devDependencies": {
    "firebase-functions-test": "^0.1.6"
  },
  "private": true
}
```

### 4. Setup nuxt-start

Add `nuxt-start` into `/functions` (specify `--ignore-engines` not to have a node version error)

```console
$ yarn --cwd functions add nuxt-start --ignore-engines
```

## Deploy

(The things we have to do before each deployment)

### 1. Install functions modules

We have to run this command everytime we add a dependency/devDependency  
(You don't need to do it after adding nuxt-start, since it will be done already)

```console
$ yarn --cwd functions --ignore-engines
```

### 2. Deploy

```console
$ firebase deploy
```

That's it!

Repo here: [Nuxt SSR app Firebase](https://github.com/sam-eah/nuxtssr-firebase).
