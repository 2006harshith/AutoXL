chrome.action.onClicked.addListener(() => {
  console.log("EXTENSION CLICKED");

  chrome.tabs.create({
    url: chrome.runtime.getURL("popup.html")
  });
});