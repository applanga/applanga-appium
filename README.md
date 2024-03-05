# Applanga Appium
This package is a helper package to capture and upload screenshots to your Applanga dashboard.

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
