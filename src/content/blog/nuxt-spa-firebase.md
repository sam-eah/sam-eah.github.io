---
title: 'Deploy Nuxt SPA to Firebase'
description: ''
pubDate: 'Nov 14, 2019'
heroImage: '/nuxt.jpg'
---

The easiest way to create and deploy to firebase a nuxt app in spa mode (single page application)

## Requirements

- A Firebase project
- npm or yarn

## Setup

(These are the things we will only need to do once.)

### 1. Create Nuxt App

Let's run nuxt cli into our project directory. (In my case I'm using vs code's terminal)

```console
$ npx create-nuxt-app
npx : 350 installé(s) en 32.227s

create-nuxt-app v2.11.1
✨  Generating Nuxt.js project in .
? Project name nuxt-spa
? Project description My doozie Nuxt.js project
? Author name sam-eah
? Choose the package manager Yarn
? Choose UI framework Vuetify.js
? Choose custom server framework None (Recommended)
? Choose Nuxt.js modules (Press <space> to select, <a> to toggle all, <i> to invert selection)
? Choose linting tools (Press <space> to select, <a> to toggle all, <i> to invert selection)
? Choose test framework None
? Choose rendering mode Single Page App
? Choose development tools jsconfig.json (Recommended for VS Code)

🎉  Successfully created project nuxt-spa
```

Afterwards, let's make sure dev mode is working

```console
$ yarn dev
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

Then let's run firebase cli, we will need Hosting only

```console
$ firebase init

     ######## #### ########  ######## ########     ###     ######  ########
     ##        ##  ##     ## ##       ##     ##  ##   ##  ##       ##
     ######    ##  ########  ######   ########  #########  ######  ######
     ##        ##  ##    ##  ##       ##     ## ##     ##       ## ##
     ##       #### ##     ## ######## ########  ##     ##  ######  ########

You're about to initialize a Firebase project in this directory:

  \nuxtspa-firebase

? Are you ready to proceed? Yes
? Which Firebase CLI features do you want to set up for this folder?
Press Space to select features, then Enter to confirm your choices.
Hosting: Configure and deploy Firebase Hosting sites

=== Project Setup

First, let's associate this project directory with a Firebase project.
You can create multiple project aliases by running firebase use --add,
but for now we'll just set up a default project.

? Please select an option: Use an existing project
? Select a default Firebase project for this directory: <your firebase project>
i  Using project <your firebase project>

=== Hosting Setup

Your public directory is the folder (relative to your project directory) that
will contain Hosting assets to be uploaded with firebase deploy. If you
have a build process for your assets, use your build's output directory.

? What do you want to use as your public directory? dist
? Configure as a single-page app (rewrite all urls to /index.html)? Yes
+  Wrote dist/index.html

i  Writing configuration info to firebase.json...
i  Writing project information to .firebaserc...

+  Firebase initialization complete!
You have now a `/functions` and a `/public` folder
```

## Deploy

(The things we have to do before each deployment)

### 1. Build

Always build your changes before deploying

```console
$ yarn build
```

This will build the `/dist` directory  
We can implement this step into the `predeploy` script inside `hosting` (in `firebase.json`)

```json
{
  "hosting": {
    "predeploy": ["yarn build"],
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

This way, it will build automatically everytime we want to deploy!

### 2. Deploy !

```console
$ firebase deploy
```

That's it!

## Conclusion

That was fast, right ? However this doesn't use Nuxt and Firebase full potentials: nuxt ssr (universal mode) with firebase functions.

Repo here: [Nuxt SPA Firebase](https://github.com/sam-eah/nuxtspa-firebase).
