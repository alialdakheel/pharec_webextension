/*
 *Consider when to run the script [ tabs.onUpdate, webNavigation.onCompleted, webNavigation.onHistoryStateUpdated]
 */

var wpd_model_url = browser.runtime.getURL("js_wpd2_model/model.json");

const filter = {
  properties: ["status", "url"]
}

const imageWidth = 512;
const imageHeight = 256;

var results = {}


var wpd_model = loadWPDModel();
//var vmodel = loadvModel();
//var nlpmodel = loadnlpModel();

var uuid = get_uuid();

const size_CSS = { 
	code: `html {height: ${imageHeight}px !important; width: ${imageWidth}px !important; overflow: clip !important;}`
}

function get_uuid() {
  return new Promise((resolve, reject) => {
    if (!uuid) {
      uuid = browser.storage.local.get('pharecwe_uuid').then((res) => {
        console.log("retreived uuid: ", res);
        if (res.pharecwe_uuid) {
          resolve(res.pharecwe_uuid);
        } else {
          console.log("uuid not found, generating..");
          var puuid = gen_uuid();
          console.log("generated puuid: ", puuid);
          browser.storage.local.set({'pharecwe_uuid': puuid});
          resolve(puuid);
        }
      });
    } else {
      resolve(uuid);
    }
  });
}

async function fetch_ga(event_st) {
  const fid = await uuid;
  fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${ga_mid}&api_secret=${ga_sec}`, {
  method: "POST",
  body: JSON.stringify({
    client_id: fid,
    user_id: fid,
    events: [{
      name: event_st,
      }]
    })
  });
}

/*
 *From: https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
 */
function gen_uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function imageCrop(imgElem) {
  var canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(imgElem, 0, 0, imageWidth, imageHeight,
	  0, 0, imageWidth, imageHeight);
  results.imageURI = canvas.toDataURL();
  return ctx.getImageData(0, 0, imageWidth, imageHeight);
}

function loadImageTensor(imageUri) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageUri;
    img.setAttribute("width", imageWidth);
    img.setAttribute("height", imageHeight);
    img.onload = () => {
      resolve(tf.browser.fromPixels(imageCrop(img)));
    }
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
    return vmodel;
  } else {
    var model = await tf.loadLayersModel(vmodel_url);
    console.log("finished loading vmodel");
    return model;
  }
}

async function loadWPDModel() {
  if (wpd_model) {
    return wpd_model;
  } else {
    var model = await tf.loadLayersModel(wpd_model_url);
    console.log("finished loading WPD model");
    return model;
  }
}
async function loadnlpModel() {
  if (nlpmodel) {
    return Promise.resolve(nlpmodel);
  } else {
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

async function runWPDModel(image_tensor) {
  if (!wpd_model) {
    console.log("WPD Model not loaded yet. waiting...");
    setTimeout(() => {runWPDModel(image_tensor);}, 3000);
    return;
  }
  var expanded_tensor = await tf.expandDims(image_tensor, 0);
  var wpd_model_output = await wpd_model.then((m) => {
    return m.predict(expanded_tensor);
  });
  var softmax_output = await tf.softmax(wpd_model_output);
  //console.log(softmax_output);
  //softmax_output.print();

  return softmax_output;
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
            console.log("vModel resutls:", 
              {isPhishv: is_phishing, vmodelOutput: vmodel_output});
            resolve({isPhishv: is_phishing, vmodelOutput: vmodel_output});
          });
        });
      });
    });
  });
}

function analyzeImage_WPD(imageUri) {
  return new Promise((resolve, reject) => {
    tf.ready().then(() => {
      tf.tidy(() => {
        loadImageTensor(imageUri).then((image_tensor) => {
          runWPDModel(rescale(image_tensor)).then(output => {
            var probits = tf.squeeze(output, 0);
            var pred_index = probits.argMax().arraySync();
            var probits_array = probits.arraySync();
            console.log("WPD top pred index:", pred_index);
            console.log("Top probit", probits_array[pred_index]);
            var top5 = probits.topk(5);
            console.log("Top 5 ind:", top5.indices.arraySync());
            console.log("Top 5 val:", top5.values.arraySync());
            results.topPred = pred_index;
            results.topProbit = probits_array[pred_index];

            resolve({topPred: pred_index, topProbit: probits_array[pred_index]});
            //var sigmoid_output = tf.sigmoid(logit);
            //var vmodel_output = sigmoid_output.arraySync();
            //var pred = tf.round(sigmoid_output).arraySync();
            //var is_phishing = !Boolean(pred);

            //results.isPhishv = is_phishing;
            //results.vmodelOutput = vmodel_output;
            //resolve({isPhishv: is_phishing, vmodelOutput: vmodel_output});
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
  //analyzeImage(imageUri);
  return analyzeImage_WPD(imageUri);
}

function onCaptureError(error) {
  console.log(`Error: ${error}`);
}

function runCapture(tabInfo) {
  var capturing = browser.tabs.captureVisibleTab();
  return capturing.then(onCapture, onCaptureError);
}

function analyzePage(tabId, changeInfo, tabInfo) {
  console.log("tabId", tabId);
  console.log("ChangeInfo", changeInfo);
  console.log("tabInfo", tabInfo);
  //
  //if (changeInfo.url)
    //analyzeURL(changeInfo.url);
  if (changeInfo.status == 'complete' && changeInfo.url == undefined) {
    console.log("Exec vision analysis...");
    // change page size (inject css in page)
    browser.tabs.insertCSS(
	    tabId,
	    size_CSS
    ).then(() => {
      runCapture(tabInfo).then(res => {
        browser.tabs.removeCSS(
                tabId,
                size_CSS
        ).then(null);
      }).catch(e => {console.log("capture failed: ", e)});
    }).catch(e => {console.log("inserting css failed: ", e)});
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
//fetch_ga('bg_run');
listenForRequest();
