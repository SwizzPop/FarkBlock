let globalBlockList = [];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({ blockList: [] }, (data) => {
    globalBlockList = data.blockList;
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addToBlockList") {
    if (!globalBlockList.includes(request.domain)) {
      globalBlockList.push(request.domain);
      chrome.storage.sync.set({ blockList: globalBlockList }, () => {
        sendResponse({ success: true });
      });
    }
    return true; // Indicates we will send a response asynchronously
  } else if (request.action === "getBlockList") {
    sendResponse({ blockList: globalBlockList });
  } else if (request.action === "removeFromBlockList") {
    globalBlockList = globalBlockList.filter(domain => domain !== request.domain);
    chrome.storage.sync.set({ blockList: globalBlockList }, () => {
      sendResponse({ success: true });
    });
    return true; // Indicates we will send a response asynchronously
  } else if (request.action === "openIncognito") {
    chrome.windows.create({
      url: request.url,
      incognito: true
    });
  }
});

