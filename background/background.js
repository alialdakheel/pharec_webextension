/*
 *Consider when to run the script [ tabs.onUpdate, webNavigation.onCompleted, webNavigation.onHistoryStateUpdated]
 */

const filter = {
  properties: ["status", "url"]
}
var results = {}

var vmodel;
var nlpmodel;

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

function loadURLTensor(URL) {
  return new Promise((resolve, reject) => {
    console.log("URL:", URL);
    var url_split = URL.split('')
    if (url_split[4] == 's')
      var the_s = url_split.splice(4, 1);
    var unicode_url =  url_split.map(c => c.charCodeAt());
    console.log("Unicode:", unicode_url);
    resolve(unicode_url);
  });
}

function rescale(image_tensor) {
	return image_tensor.toFloat().div(tf.scalar(255));
}

async function loadvModel() {
  if (vmodel) {
    return Promise.resolve(vmodel);
  } else {
  var vmodel_url = browser.runtime.getURL("js_vmodel/model.json");
  return tf.loadLayersModel(vmodel_url);
  }
}

async function loadnlpModel() {
  if (nlpmodel) {
    return Promise.resolve(nlpmodel);
  } else {
  var nlpmodel_url = browser.runtime.getURL("js_nlpmodel/model.json");
  return tf.loadLayersModel(nlpmodel_url);
  }
}

async function runvModel(vmodel, image_tensor) {
  var expanded_tensor = await tf.expandDims(image_tensor, 0);
  var vmodel_output = await vmodel.predict(expanded_tensor);

  return vmodel_output;
}

async function runnlpModel(nlpmodel, url_tensor) {
  console.log('url_tensor', url_tensor);
  var expanded_tensor = await tf.expandDims(url_tensor, 0);
  console.log('expanded_tensor', expanded_tensor);
  var nlpmodel_output = await nlpmodel.predict(expanded_tensor);

  return nlpmodel_output;
}

function analyzeImage(imageUri) {
  return new Promise((resolve, reject) => {
    tf.ready().then(() => {
      tf.tidy(() => {
        Promise.all([
          loadvModel(),
          loadImageTensor(imageUri)
        ]).then((result) => {
          vmodel = result[0];
          image_tensor = result[1];
          runvModel(vmodel, rescale(image_tensor)).then(output => {
            var logit = tf.squeeze(output, [0, 1]);
            var sigmoid_output = tf.sigmoid(logit);
            var vmodel_output = sigmoid_output.arraySync();
            var pred = tf.round(sigmoid_output).arraySync();
            var is_phishing = !Boolean(pred);

            results.isPhishv = is_phishing;
            results.vmodelOutput = vmodel_output;
            console.log("vresults:", {isPhish: is_phishing, vmodelOutput: vmodel_output});
            resolve({isPhishv: is_phishing, vmodelOutput: vmodel_output});
          });
        });
      });
    });
  });
}

function analyzeURL(URL) {
  return new Promise((resolve, reject) => {
    tf.ready().then(() => {
      tf.tidy(() => {
        Promise.all([
          loadnlpModel(),
          loadURLTensor(URL)
        ]).then((result) => {
          nlpmodel = result[0];
          url_tensor = result[1];
          runnlpModel(nlpmodel, url_tensor).then(output => {
            console.log("output:", output);
            console.log("output:", output.arraySync());
            var logit = tf.squeeze(output, [0, 1]);
            var sigmoid_output = tf.sigmoid(logit);
            var nlpmodel_output = sigmoid_output.arraySync();
            console.log("nlp output:", nlpmodel_output);
            var pred = tf.round(sigmoid_output).arraySync();
            var is_phishing = Boolean(pred);
            console.log("is_phish:", is_phishing);

            results.isPhishnlp = is_phishing;
            results.nlpmodelOutput = nlpmodel_output;
            resolve({isPhishnlp: is_phishing, nlpmodelOutput: nlpmodel_output});
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
  console.log("tabId", tabId);
  console.log("ChangeInfo", changeInfo);
  console.log("tabInfo", tabInfo);
  if (changeInfo.url)
    analyzeURL(changeInfo.url);
  if (changeInfo.status == 'complete' && changeInfo.url == undefined) {
    console.log("Exec vision analysis...");
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
