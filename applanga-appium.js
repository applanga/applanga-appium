var parseStringPromise = require('xml2js').parseStringPromise;
var fs = require('fs');
var axios = require('axios');
var sizeOf = require('image-size');

const apiUrl = 'https://api.applanga.com/v1/api/screenshots?app=';

async function captureScreenshot(driver, tagName, applangaJsonPath) {
  apiToken = getAPIToken(applangaJsonPath);
  appId = getAppID(applangaJsonPath);

  let screenshotLocation = __dirname + '/tmpScreen.png';
  var dimensions;
  try {
    screenshot = await driver.takeScreenshot();
    await fs.promises.writeFile(screenshotLocation, screenshot, 'base64');
  } catch (error) {
    console.log('Error ocurred while saving screenshot: ' + error);
  }

  const screenshotDimensions = sizeOf(screenshotLocation);

  let xml = await driver.getPageSource();
  let parsedXml = await parseStringPromise(xml);
  let allTexts = getAllTextOnScreen(driver, parsedXml);
  let positions = await getAllTextPositions(
    driver,
    allTexts,
    screenshotDimensions
  );

  await doUpload(
    driver,
    tagName,
    apiToken,
    appId,
    positions,
    screenshotLocation
  );
}

function getDeviceLanguageLong(client) {
  let country = client.isAndroid
    ? client.capabilities.desired.locale
    : client.capabilities.locale;
  let language = client.isAndroid
    ? client.capabilities.desired.language
    : client.capabilities.language;
  if (!country) return language;
  else return language + '-' + country;
}

function getAllTextOnScreen(driver, object) {
  var foundTexts = [];
  for (var key in object) {
    if (object.hasOwnProperty(key)) {
      let value = object[key];
      if (typeof value == 'object') {
        foundTexts = foundTexts.concat(getAllTextOnScreen(driver, value));
      }
      var text;
      for (let i = 0; i < value.length; i++) {
        if (value[i]['$'] === undefined) continue;
        if (driver.isAndroid) {
          text = value[i]['$']['text'];
        } else {
          text = value[i]['$']['label'];
        }
        if (text !== undefined && text != null && text !== '') {
          foundTexts.push(text);
        }
      }
    }
  }
  return foundTexts;
}

async function getAllTextPositions(client, allTexts, screenshotDimensions) {
  var positions = [];
  var ratio = 1;
  if (!client.isAndroid) {
    // get the ratio for iOS devices
    // get screen size
    const screen = await client.$(`//XCUIElementTypeApplication`);
    let screenPosition = await screen.getLocation();
    let screenSize = await screen.getSize();
    if (screenPosition.x != 0 || screenPosition.y != 0) {
      console.error(
        'Screen position is not 0,0. This is not supported by Applanga. Please make sure your app is fullscreen.'
      );
    }
    ratio = screenshotDimensions.width / screenSize.width;
  } 
  for (let i = 0; i < allTexts.length; i++) {
    const textValue = allTexts[i];
    var element;
    if (client.isAndroid) {
      const selector = 'new UiSelector().text("' + textValue + '")';
      element = await client.$(`android=${selector}`);
    } else {
      const selector = `label == '` + textValue + `'`;
      element = await client.$(`-ios predicate string:${selector}`);
    }

    let elementPosition = await element.getLocation();
    let elementSize = await element.getSize();
    positions.push({
      text: textValue,
      x: elementPosition.x * ratio,
      y: elementPosition.y * ratio,
      width: elementSize.width * ratio,
      height: elementSize.height * ratio,
    });
  }
  return positions;
}

async function doUpload(
  client,
  tagName,
  apiToken,
  appId,
  stringPositions,
  imageLocation
) {
  let screenSize = await client.getWindowRect();
  let opts = client.capabilities;
  var data = {
    screenTag: tagName,
    width: screenSize.width,
    height: screenSize.height,
    deviceModel: opts.deviceModel || 'appium',
    platform: opts.platformName,
    operatingSystem: opts.platformVersion || opts.platform,
    bundleVersion: 1,
    deviceLanguageLong: getDeviceLanguageLong(client),
    isBlank: false,
    useOCR: false,
    stringPositions: stringPositions,
  };
  const form = {
    data: JSON.stringify(data),
    file: fs.createReadStream(imageLocation),
  };

  const headers = {
    Authorization: apiToken,
    'Content-Type': 'multipart/form-data',
  };
  const fullUrl = apiUrl + appId;
  try {
    let res = await axios.post(fullUrl, form, { headers: headers });
    if (res.status != 200) {
      console.error(
        'Applanga Screenshot upload failed with status code: ',
        res.status + ', msg: ' + res.data.message
      );
    } else {
      console.log('Applanga Screenshot Upload successful!');
    }
  } catch (err) {
    console.error('Applanga Screenshot upload failed:', err);
  }
}

// returns the api token in the format "Bearer <token>"
function getAPIToken(path) {
  if (!path) path = '';

  let applangaJson = JSON.parse(fs.readFileSync(path + '.applanga.json'));
  let apiKey = applangaJson.app.access_token;

  if (apiKey.length != 57) {
    console.log('Invalid Applanga API token.');
    return;
  }
  return 'Bearer ' + apiKey;
}

function getAppID(path) {
  let token = getAPIToken(path);

  // remove Bearer from token
  let str = token.substring('Bearer '.length);
  if (str.charAt(24) != '!') {
    console.log('Invalid Applanga AppID, missing exclamation mark.');
    return;
  }
  var appId = str.substring(0, 24);
  return appId;
}

module.exports = { captureScreenshot };
