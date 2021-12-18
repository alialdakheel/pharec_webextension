var bg = browser.extension.getBackgroundPage();

function computeConfidence(modelOutput) {
  return Math.abs(modelOutput - 0.5) * 2 * 100;
}

function update_capture_output(imgURI){
  var image_elem = document.getElementById("imgCapture");
  image_elem.src = imgURI;
}

function update_pred_output(results){
  var pred_elem = document.getElementById("vpred-output");
  pred_elem.innerHTML = "Is Phishing? " + results.isPhishv;
  if (results.isPhishv) {
    pred_elem.style.color = 'red';
  } else {
    pred_elem.style.color = 'green';
  }

  var model_elem = document.getElementById("vmodel-output");
  model_elem.innerHTML = "Confidence: " + computeConfidence(results.vmodelOutput).toFixed(2) + " %";

}

function listenForBackground() {
  browser.runtime.onMessage.addListener(
    (msg, sender) => {
      if (msg.type == "imgCapture") {
        update_capture_output(msg.data.imageURI);
      } else if (msg.type == "Result") {
        update_pred_output(msg.data);
      } else {}
    });
}

function onCapture(imageUri) {
  update_capture_output(imageUri);
  /*
   *image_elem.addEventListener("click", (e) => {
	 *  e.target.style.maxHeight = e.target.style.maxHeight === "100%" ? "100vw" : "100%";
   *});
   */
  bg.analyzeImage(imageUri).then((res) => {
    update_pred_output(res);
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
     * Log the error to the console.
     */
    function reportError(error) {
      console.error(`Could not run: ${error}`);
    }

    /**
     * Get the active tab,
     * then call "run()" or "reset()" as appropriate.
     */
    if (e.target.classList.contains("runCapture")) {
      bg.fetch_ga('runcapture_click');
      browser.tabs.query({active: true, currentWindow: true})
        .then(runCapture)
        .catch(reportError);
    }
    else if (e.target.classList.contains("incorrectClass")) {
      bg.fetch_ga('incorrectclass_click');
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
  update_capture_output(response.data.imageURI);
  update_pred_output(response.data);
});

bg.fetch_ga('popup_click');
