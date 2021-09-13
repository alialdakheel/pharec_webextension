
function computeConfidence(modelOutput) {
  return Math.abs(modelOutput - 0.5) * 2 * 100;
}

function listenForBackground() {
  browser.runtime.onMessage.addListener(
    (msg, sender) => {
      if (msg.type == "imgCapture") {
        var image_elem = document.getElementById("imgCapture");
        image_elem.src = msg.data.imageURI;
      } else if (msg.type == "Result") {
        var vpred_elem = document.getElementById("vpred-output");
        vpred_elem.innerHTML = "Is Phishing? " + msg.data.isPhishv;
        if (msg.data.isPhishv) {
          vpred_elem.style.color = 'red';
        } else {
          vpred_elem.style.color = 'green';
        }

        var vmodel_elem = document.getElementById("vmodel-output");
        vmodel_elem.innerHTML = "Confidence: " + computeConfidence(msg.data.vmodelOutput).toFixed(2) + " %";

      } else {}
    });
}

function onCapture(imageUri) {
  var image_elem = document.getElementById("imgCapture");
  image_elem.src = imageUri;
  /*
   *image_elem.addEventListener("click", (e) => {
	 *  e.target.style.maxHeight = e.target.style.maxHeight === "100%" ? "100vw" : "100%";
   *});
   */
  var bg = browser.extension.getBackgroundPage();
  bg.analyzeImage(imageUri).then((res) => {
    var pred_elem = document.getElementById("vpred-output");
    pred_elem.innerHTML = "Is Phishing? " + res.isPhishv;
    if (res.isPhishv) {
      pred_elem.style.color = 'red';
    } else {
      pred_elem.style.color = 'green';
    }

    var model_elem = document.getElementById("vmodel-output");
    model_elem.innerHTML = "Confidence: " + computeConfidence(res.vmodelOutput).toFixed(2) + " %";
  });
}

function onCaptureError(error) {
  console.log(`Error: ${error}`);
}

/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
  document.addEventListener("click", (e) => {

    /**
     * Run capture then process the image
     */
    function runCapture(tabs) {

      var capturing = browser.tabs.captureVisibleTab();
      capturing.then(onCapture, onCaptureError);
    }

    function reset(tabs) {
      /*
       *browser.tabs.removeCSS({code: hidePage}).then(() => {
       *  browser.tabs.sendMessage(tabs[0].id, {
       *    command: "reset",
       *  });
       *});
       */
    }

    /**
     * Just log the error to the console.
     */
    function reportError(error) {
      console.error(`Could not run: ${error}`);
    }

    /**
     * Get the active tab,
     * then call "run()" or "reset()" as appropriate.
     */
    if (e.target.classList.contains("runCapture")) {
      browser.tabs.query({active: true, currentWindow: true})
	.then(runCapture)
        .catch(reportError);

    }
    else if (e.target.classList.contains("reset")) {
      browser.tabs.query({active: true, currentWindow: true})
        .then(reset)
        .catch(reportError);
    }
  });
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(`Failed to execute run content script: ${error.message}`);
}

listenForBackground();
listenForClicks();
browser.runtime.sendMessage({type: "getResults"}).then((response) => {
  //console.log("Results:", response);
  var image_elem = document.getElementById("imgCapture");
  image_elem.src = response.data.imageURI;

  var pred_elem = document.getElementById("vpred-output");
  pred_elem.innerHTML = "Is Phishing? " + response.data.isPhishv;
  if (response.data.isPhishv) {
    pred_elem.style.color = 'red';
  } else {
    pred_elem.style.color = 'green';
  }

  var model_elem = document.getElementById("vmodel-output");
  model_elem.innerHTML = "Confidence: " + computeConfidence(response.data.vmodelOutput).toFixed(2) + " %";
  var pred_elem = document.getElementById("nlppred-output");
  pred_elem.innerHTML = "" + response.data.isPhishnlp;
  if (response.data.isPhishnlp) {
    pred_elem.style.color = 'red';
  } else {
    pred_elem.style.color = 'green';
  }

  var nlpmodel_elem = document.getElementById("nlpmodel-output");
  nlpmodel_elem.innerHTML = "" + computeConfidence(response.data.nlpmodelOutput).toFixed(2) + " %";
});
  
