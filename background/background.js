/*
 *Consider when to run the script [ tabs.onUpdate, webNavigation.onCompleted, webNavigation.onHistoryStateUpdated]
 */

const filter = {
  properties: ["status", "url"]
}
var results = {}

var vmodel = loadvModel();
var nlpmodel = loadnlpModel();

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
    //console.log("URL:", URL);
    var url_split = URL.split('')
    if (url_split[4] == 's')
      var the_s = url_split.splice(4, 1);
    var unicode_url =  url_split.map(c => c.charCodeAt());
    resolve(unicode_url);
  });
}

function rescale(image_tensor) {
	return image_tensor.toFloat().div(tf.scalar(255));
}

async function loadvModel() {
  if (vmodel) {
    //return Promise.resolve(vmodel);
    return vmodel;
  } else {
    var vmodel_url = browser.runtime.getURL("js_vmodel/model.json");
    var model = await tf.loadLayersModel(vmodel_url);
    console.log("finished loading vmodel");
    //return Promise.resolve(model);
    return model;
  }
}

async function loadnlpModel() {
  if (nlpmodel) {
    return Promise.resolve(nlpmodel);
  } else {
    var nlpmodel_url = browser.runtime.getURL("js_nlpmodel/model.json");
    var model = await tf.loadLayersModel(nlpmodel_url);
    console.log("finished loading nlpmodel");
    return Promise.resolve(model);
  }
}

async function runvModel(image_tensor) {
  if (!vmodel) {
    console.log("vModel not loaded yet. waiting...");
    setTimeout(() => {runvModel(image_tensor);}, 3000);
    return;
  }
  var expanded_tensor = await tf.expandDims(image_tensor, 0);
  var vmodel_output = await vmodel.then((m) => {
    return m.predict(expanded_tensor);
  });

  return vmodel_output;
}

async function runnlpModel(url_tensor) {
  if (!nlpmodel) {
    console.log("nlpModel not loaded yet. waiting...");
    setTimeout(() => {runnlpModel(url_tensor);}, 3000);
    return;
  }
  var expanded_tensor = await tf.expandDims(url_tensor, 0);
  var nlpmodel_output = await nlpmodel.then((m) => {
    return m.predict(expanded_tensor);
  });

  return nlpmodel_output;
}

function analyzeImage(imageUri) {
  return new Promise((resolve, reject) => {
    tf.ready().then(() => {
      tf.tidy(() => {
        loadImageTensor(imageUri).then((image_tensor) => {
          runvModel(rescale(image_tensor)).then(output => {
            var logit = tf.squeeze(output, [0, 1]);
            var sigmoid_output = tf.sigmoid(logit);
            var vmodel_output = sigmoid_output.arraySync();
            var pred = tf.round(sigmoid_output).arraySync();
            var is_phishing = !Boolean(pred);

            results.isPhishv = is_phishing;
            results.vmodelOutput = vmodel_output;
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
        loadURLTensor(URL).then((url_tensor) => {
          runnlpModel(url_tensor).then(output => {
            var logit = tf.squeeze(output, [0, 1]);
            var sigmoid_output = tf.sigmoid(logit);
            var nlpmodel_output = sigmoid_output.arraySync();
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
  //console.log("tabId", tabId);
  //console.log("ChangeInfo", changeInfo);
  //console.log("tabInfo", tabInfo);
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
