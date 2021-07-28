
(function() {
  /**
   * Check and set a global guard variable.
   * If this content script is injected into the same page again,
   * it will do nothing next time.
   */
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  /**
   * Given a URL to a beast image, remove all existing beasts, then
   * create and style an IMG node pointing to
   * that image, then insert the node into the document.
   */
  //function insertBeast(beastURL) {
    //removeExistingBeasts();
    //let beastImage = document.createElement("img");
    //beastImage.setAttribute("src", beastURL);
    //beastImage.style.height = "100vh";
    //beastImage.className = "beastify-image";
    //document.body.appendChild(beastImage);
  //}
  function Run() {
    console.log("Injected script has Run")
    let header_elem = document.createElement("h1");
    let t = document.createTextNode("Pharec has Run");
    header_elem.className = "h1-pharec";
    header_elem.appendChild(t);
    document.body.appendChild(header_elem);
  }

  /**
   * Remove every beast from the page.
   */
  function removeExistingH1() {
    let existingH1 = document.querySelectorAll(".h1-pharec");
    for (let header_elem of existingH1) {
      header_elem.remove();
    }
  }

  function onCapture(imgUri){
    console.log("captured..");
    console.log(imageUri);
  }

  /**
   * Listen for messages from the background script.
   * Call "insertBeast()" or "removeExistingBeasts()".
  */
  browser.runtime.onMessage.addListener((message) => {
    if (message.command === "run") {
      //insertBeast(message.beastURL);
      Run();
      //var capturing = browser.tabs.captureVisibleTab();
      //capturing.then(onCapture, removeExistingH1);
    } else if (message.command === "reset") {
      //removeExistingBeasts();
      removeExistingH1();
    }
  });

})();
