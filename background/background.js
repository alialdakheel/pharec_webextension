
/*
 *Consider when to run the script [ tabs.onUpdate, webNavigation.onCompleted, webNavigation.onHistoryStateUpdated]
 */

const filter = {
  properties: ["status", "url"]
}

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
  //var model_ret = await tf.loadLayersModel(model_url);
  //return model_ret;
}

async function runModel(model, image_tensor) {
  var expanded_tensor = await tf.expandDims(image_tensor, 0);
  var model_output = await model.predict(expanded_tensor);

  return model_output;
}

function analyzeImage(imageUri) {
  tf.ready().then(() => {
    tf.tidy(() => {
      //if (!model) {
        //model = loadModel();
      //}
      //model.summary();
      //loadImageTensor(imageUri).then((image_tensor) => {
        //loadModel().then((model) => {

      Promise.all([
        loadModel(),
        loadImageTensor(imageUri)
      ]).then((result) => {
        model = result[0];
        image_tensor = result[1];
        runModel(model, rescale(image_tensor)).then(output => {
          var pred = tf.squeeze(tf.round(tf.sigmoid(output)), [0, 1]).arraySync();
          var is_phishing = !Boolean(pred);

/*
 *          var pred_elem = document.getElementById("pred-output");
 *          pred_elem.innerHTML = "Is Phishing? " + is_phishing;
 *
 *          var logit_elem = document.getElementById("logit-output");
 *          logit_elem.innerHTML = "Output (logit): " + tf.squeeze(output, [0, 1]).arraySync();
 */
            console.log("Is Phishing? " + is_phishing);
            console.log("Output (logit): " + tf.squeeze(output, [0, 1]).arraySync());
        });
      });
    });
  });
}

function onCapture(imageUri) {
  /*
   *var image_elem = document.getElementById("imgCapture");
   *image_elem.src = imageUri;
   *image_elem.addEventListener("click", (e) => {
	 *  e.target.style.maxHeight = e.target.style.maxHeight === "100%" ? "100vw" : "100%";
   *});
   */
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
  if (changeInfo.status == 'complete' && changeInfo.url == undefined) {
    console.log("Exec analysis...");
    runCapture(tabInfo);
  }
}

browser.tabs.onUpdated.addListener(analyzePage, filter);
