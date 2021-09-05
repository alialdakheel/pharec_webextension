
/**
 * CSS to hide everything on the page,
 * except for elements that have the "beastify-image" class.
 */
const hidePage = `body > :not(.h1-pharec) {
                    display: none;
                  }`;

function listenForBackground(){
  browser.runtime.onMessage.addListener(
    (msg, sender) => {
      if (msg.type == "imgCapture") {
        var image_elem = document.getElementById("imgCapture");
        image_elem.src = msg.data.imageURI;
      } else if (msg.type == "Result") {
        var pred_elem = document.getElementById("pred-output");
        pred_elem.innerHTML = "Is Phishing? " + msg.data.isPhishv;
        if (msg.data.isPhishv) {
          pred_elem.style.color = 'red';
        } else {
          pred_elem.style.color = 'green';
        }

        var model_elem = document.getElementById("model-output");
        model_elem.innerHTML = "Probability: " + (msg.data.vmodelOutput * 100).toFixed(2) + " %";
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
    var pred_elem = document.getElementById("pred-output");
    pred_elem.innerHTML = "Is Phishing? " + res.isPhishv;
    if (res.isPhishv) {
      pred_elem.style.color = 'red';
    } else {
      pred_elem.style.color = 'green';
    }

    var model_elem = document.getElementById("model-output");
    model_elem.innerHTML = "Probability: " + (res.vmodelOutput * 100).toFixed(2) + " %";
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

      /*
       *browser.tabs.insertCSS({code: hidePage}).then(() => {
       *  browser.tabs.sendMessage(tabs[0].id, {
       *    command: "run",
       *    //beastURL: url
       *  });
       *});
       */
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

/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
//browser.tabs.executeScript({file: "/content_scripts/run_contentscript.js"})
//.then(listenForClicks)
//.catch(reportExecuteScriptError);
listenForBackground();
listenForClicks();
browser.runtime.sendMessage({type: "getResults"}).then((response) => {
        var image_elem = document.getElementById("imgCapture");
        image_elem.src = response.data.imageURI;

        var pred_elem = document.getElementById("pred-output");
        pred_elem.innerHTML = "Is Phishing? " + response.data.isPhishv;
        if (response.data.isPhishv) {
          pred_elem.style.color = 'red';
        } else {
          pred_elem.style.color = 'green';
        }

        var model_elem = document.getElementById("model-output");
        model_elem.innerHTML = "Probability: " + (response.data.vmodelOutput * 100).toFixed(2) + " %";
});
  
