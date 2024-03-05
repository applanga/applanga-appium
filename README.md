# Applanga Appium
This package is a helper package to capture and upload screenshots to a connected Applanga project.

## What is Applanga?
Applanga is a localization and translation management platform that provides integration options for developers, a web dashboard to manage the translation process, an in-context translation editor, and a scalable delivery network to deploy your desired translation setup and workflow at any scale. Furthermore, Applanga is a GlobalLink technology and part of TransPerfect which allows any Applanga client to access any translation service required, including highly specialized services for eCOA or medical devices.  
More info [here](https://www.applanga.com/)

## Why use Appium and Applanga together?

Apps may have many screens and menus, and manually going through an app to take screenshots takes a lot of time. This is multiplied by the number of languages you want to cover. If, in turn, you want to leverage these screenshots for translation review, you also need an environment to efficiently review the screenshots, track the review process, and implement any needed changes. This process might need to be repeated over multiple review rounds to resolve all linguistic and functional issues.  

With Appium and Applanga combined, as shown in the examples stored in this repo, it is possible to automate this process completely. For example, after the initial scripts are written, you could take 20 screenshots in 20 languages simply by running a script and letting it work in the background on a timer whenever you detect changes on Applanga (e.g. via webhook). 


# Installation
Add this repository to your `package.json`
```json
"dependencies": {
  "applanga-appium": "github:applanga/applanga-appium"
}
```

# Usage

## Import

```javascript
const applanga = require('applanga-appium');
```

## Capture Screenshot

The method `captureScreenshot` has two mandatory parameters and one optional parameter.

1. The first parameter is your Appium driver.
2. The second one defines your tag name for this screenshot
3. The third one is the path to your .applanga.json. By default place your `.applanga.json` in the same directory as your script, otherwise define your path to the file here.

Example:
```javascript
var client = await wdio.remote(getOptions(country, language));
var tagName = 'home';
await applanga.captureScreenshot(
  client,
  tagName,
);
```
