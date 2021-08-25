
/**
 * CSS to hide everything on the page,
 * except for elements that have the "beastify-image" class.
 */
const hidePage = `body > :not(.h1-pharec) {
                    display: none;
                  }`;


function onCapture(imageUri) {
  var image_elem = document.getElementById("imgCapture");
  image_elem.src = imageUri;
  image_elem.addEventListener("click", (e) => {
	  e.target.style.maxHeight = e.target.style.maxHeight === "100%" ? "100vw" : "100%";
  });

  tf.ready().then(() => {
    tf.tidy(() => {
      loadImageTensor(imageUri).then((image_tensor) => {
        runModel(rescale(image_tensor)).then(output => {
          var pred = tf.squeeze(tf.round(tf.sigmoid(output)), [0, 1]).arraySync();
          var is_phishing = !Boolean(pred);

          var pred_elem = document.getElementById("pred-output");
          pred_elem.innerHTML = "Is Phishing? " + is_phishing;

          var logit_elem = document.getElementById("logit-output");
          logit_elem.innerHTML = "Output (logit): " + tf.squeeze(output, [0, 1]).arraySync();

        });
      });
    });
  });
  
}

function onCaptureError(error) {
  console.log(`Error: ${error}`);
}

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

async function runModel(image_tensor) {
  var model_url = browser.runtime.getURL("js_model/model.json")
  const model = await tf.loadLayersModel(model_url);
  var expanded_tensor = await tf.expandDims(image_tensor, 0);
  var model_output = await model.predict(expanded_tensor);

  return model_output;
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
listenForClicks()

