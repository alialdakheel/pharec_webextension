var bg = browser.extension.getBackgroundPage();

var class_names = ['absa', 'adidas', 'adobe', 'airbnb', 'alibaba', 'aliexpress', 'allegro', 'amazon', 'ameli_fr', 'american_express', 'anadolubank', 'aol', 'apple', 'arnet_tech', 'aruba', 'att', 'azul', 'bahia', 'banco_de_occidente', 'banco_inter', 'bankia', 'barclaycard', 'barclays', 'bbt', 'bcp', 'bestchange', 'blizzard', 'bmo', 'bnp_paribas', 'bnz', 'boa', 'bradesco', 'bt', 'caixa_bank', 'canada', 'capital_one', 'capitec', 'cathay_bank', 'cetelem', 'chase', 'cibc', 'cloudconvert', 'cloudns', 'cogeco', 'commonwealth_bank', 'cox', 'crate_and_barrel', 'cryptobridge', 'daum', 'db', 'dhl', 'dkb', 'docmagic', 'dropbox', 'ebay', 'eharmony', 'erste', 'etisalat', 'etrade', 'facebook', 'fibank', 'file_transfer', 'fnac', 'fsnb', 'godaddy', 'google', 'google_drive', 'gov_uk', 'grupo_bancolombia', 'hfe', 'hsbc', 'htb', 'icloud', 'ics', 'ieee', 'impots_gov', 'infinisource', 'instagram', 'irs', 'itau', 'itunes', 'knab', 'la_banque_postale', 'la_poste', 'latam', 'lbb', 'lcl', 'linkedin', 'lloyds_bank', 'made_in_china', 'mbank', 'mdpd', 'mew', 'microsoft', 'momentum_office_design', 'ms_bing', 'ms_office', 'ms_onedrive', 'ms_outlook', 'ms_skype', 'mweb', 'my_cloud', 'nab', 'natwest', 'navy_federal', 'nedbank', 'netflix', 'netsons', 'nordea', 'ocn', 'one_and_one', 'orange', 'orange_rockland', 'otrs', 'ourtime', 'paschoalotto', 'paypal', 'postbank', 'qnb', 'rbc', 'runescape', 'sharp', 'shoptet', 'sicil_shop', 'smartsheet', 'smiles', 'snapchat', 'sparkasse', 'standard_bank', 'steam', 'strato', 'stripe', 'summit_bank', 'sunrise', 'suntrust', 'swisscom', 'taxact', 'tech_target', 'telecom', 'test_rite', 'timeweb', 'tradekey', 'twins_bnk', 'twitter', 'typeform', 'usaa', 'walmart', 'wells_fargo', 'whatsapp', 'wp60', 'xtrix_tv', 'yahoo', 'youtube', 'ziggo', 'zoominfo'];

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

function update_wpd_pred_output(results){
  var pred_elem = document.getElementById("vpred-output");
  pred_elem.innerHTML = "Class: " + class_names[results.topPred];
  //if (class_names[results.topPred] === results.domain) {
    //pred_elem.style.color = 'green';
  //} else {
    //pred_elem.style.color = 'red';
  //}

  var model_elem = document.getElementById("vmodel-output");
  model_elem.innerHTML = "Probability: " + results.topProbit.toFixed(2)*100 + " %";
}

function listenForBackground() {
  browser.runtime.onMessage.addListener(
    (msg, sender) => {
      if (msg.type == "imgCapture") {
        update_capture_output(msg.data.imageURI);
      } else if (msg.type == "Result") {
        update_wpd_pred_output(msg.data);
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
  bg.analyzeImage_WPD(imageUri).then((res) => {
    update_wpd_pred_output(res);
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
  update_wpd_pred_output(response.data);
});

bg.fetch_ga('popup_click');
