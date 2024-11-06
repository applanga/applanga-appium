var parseStringPromise = require('xml2js').parseStringPromise;
var fs = require('fs');
var axios = require('axios');
var sizeOf = require('image-size');

const apiUrl = 'https://api.applanga.com/v1/api/screenshots?app=';

async function captureScreenshot(driver, tagName, applangaJsonPath) {
  apiToken = getAPIToken(applangaJsonPath);
  appId = getAppID(applangaJsonPath);

  let screenshotLocation = __dirname + '/tmpScreen.png';

  try {
    screenshot = await driver.takeScreenshot();
    await fs.promises.writeFile(screenshotLocation, screenshot, 'base64');
  } catch (error) {
    console.log('Error ocurred while saving screenshot: ' + error);
  }

  const screenshotDimensions = sizeOf(screenshotLocation);

  let xml = await driver.getPageSource();
  let parsedXml = await parseStringPromise(xml);
  
  let ratio = await getRatio(driver, screenshotDimensions);

  let positions = []
  await getAllTextOnScreen(driver, parsedXml, ratio, positions);

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

async function getAllTextOnScreen(driver, object, ratio, positions) {
  for (var key in object) {
    if (object.hasOwnProperty(key)) {
      let value = object[key];

      if (typeof value == 'object') {
        await getAllTextOnScreen(driver, value, ratio, positions);
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
          await getTextPositions(value[i], text, ratio, positions);
        }
      }
    }
  }
}

async function getRatio(driver, screenshotDimensions) {
  var ratio = 1;

  if (!driver.isAndroid) {
    // get the ratio for iOS devices
    // get screen size
    const screen = await driver.$(`//XCUIElementTypeApplication`);

    let screenPosition = await screen.getLocation();
    let screenSize = await screen.getSize();
    
    if (screenPosition.x != 0 || screenPosition.y != 0) {
      console.error(
        'Screen position is not 0,0. This is not supported by Applanga. Please make sure your app is fullscreen.'
      );
    }

    ratio = screenshotDimensions.width / screenSize.width;
  }

  return ratio;
}

async function getTextPositions(object, textValue, ratio, positions) {
  let values = object['$'];

  let x = values['x'];
  let y = values['y'];
  let width = values['width'];
  let height = values['height'];

  let regex = /\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]/g;
  let matches = regex.exec(values.bounds);
  if(matches !== null && matches !== undefined && matches.length == 5){
    x = matches[1];
    y = matches[2];
    width = matches[3] - x ;
    height = matches[4] - y;
  }

  positions.push({
    text: textValue,
    x: x * ratio,
    y: y * ratio,
    width: width * ratio,
    height: height * ratio,
  });
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
    useFuzzyMatching: false
  };
  const form = {
    data: JSON.stringify(data),
    file: fs.createReadStream(imageLocation),
  };

  const headers = {
    Authorization: apiToken,
    'Content-Type': 'multipart/form-data',
    'X-Integration': 12
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

