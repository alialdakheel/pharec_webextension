/*
 *Consider when to run the script [ tabs.onUpdate, webNavigation.onCompleted, webNavigation.onHistoryStateUpdated]
 */

const filter = {
  properties: ["status", "url"]
}
var results = {}

var model;

function loadImageTensor(imageUri) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageUri;
    img.setAttribute("width", 512);
    img.setAttribute("height", 256);
    img.onload = () => resolve(tf.browser.fromPixels(img));
    img.onerror = (err) => reject(err);
  });
}

function rescale(image_tensor) {
	return image_tensor.toFloat().div(tf.scalar(255));
}

async function loadModel() {
  if (model) {
    return Promise.resolve(model);
  } else {
  var model_url = browser.runtime.getURL("js_model/model.json");
  return tf.loadLayersModel(model_url);
  }
}

async function runModel(model, image_tensor) {
  var expanded_tensor = await tf.expandDims(image_tensor, 0);
  var model_output = await model.predict(expanded_tensor);

  return model_output;
}

function analyzeImage(imageUri) {
  return new Promise((resolve, reject) => {
    tf.ready().then(() => {
      tf.tidy(() => {
        Promise.all([
          loadModel(),
          loadImageTensor(imageUri)
        ]).then((result) => {
          model = result[0];
          image_tensor = result[1];
          runModel(model, rescale(image_tensor)).then(output => {
            var logit = tf.squeeze(output, [0, 1]);
            var sigmoid_output = tf.sigmoid(logit);
            var model_output = sigmoid_output.arraySync();
            var pred = tf.round(sigmoid_output).arraySync();
            var is_phishing = !Boolean(pred);

            results.isPhish = is_phishing;
            results.modelOutput = model_output;
            resolve({isPhish: is_phishing, modelOutput: model_output});
          });
        });
      });
    });
  });
}

function onCapture(imageUri) {
  results.imageURI = imageUri;
  analyzeImage(imageUri);
}

function onCaptureError(error) {
  console.log(`Error: ${error}`);
}

function runCapture(tab) {
  var capturing = browser.tabs.captureVisibleTab();
  capturing.then(onCapture, onCaptureError);
}

function analyzePage(tabId, changeInfo, tabInfo) {
  //console.log("tabId", tabId);
  //console.log("ChangeInfo", changeInfo);
  //console.log("tabInfo", tabInfo);
  if (changeInfo.status == 'complete' && changeInfo.url == undefined) {
    //console.log("Exec analysis...");
    runCapture(tabInfo);
  }
}

function listenForRequest() {
  browser.runtime.onMessage.addListener(
    (msg, sender, sendResponse) => {
      if (msg.type == "getResults") {
        sendResponse({
          type: "Results",
          data: results 
        })
      } else {}
    }
  );
}

browser.tabs.onUpdated.addListener(analyzePage, filter);
listenForRequest();
