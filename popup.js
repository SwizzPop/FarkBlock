console.log('Popup script starting');

function updateBlockListUI(blockList) {
  const blockListElement = document.getElementById('blockList');
  if (!blockListElement) return;

  blockListElement.innerHTML = '';
  if (blockList.length === 0) {
    blockListElement.innerHTML = '<li>No domains blocked</li>';
  } else {
    const sortedList = blockList.sort((a, b) => a.localeCompare(b));
    sortedList.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      li.onclick = () => removeFromList(item, 'block');
      blockListElement.appendChild(li);
    });
  }
}

function updateIncognitoListUI(incognitoList) {
  console.log('Updating incognito list UI:', incognitoList);
  const incognitoListElement = document.getElementById('incognitoList');
  if (!incognitoListElement) {
    console.log('incognitoList element not found');
    return;
  }

  incognitoListElement.innerHTML = '';
  
  // Ensure incognitoList is an array
  const listArray = Array.isArray(incognitoList) ? incognitoList : [];
  
  if (listArray.length === 0) {
    incognitoListElement.innerHTML = '<li>No domains in incognito</li>';
  } else {
    // Filter out any non-string values before sorting
    const validItems = listArray.filter(item => typeof item === 'string');
    const sortedList = validItems.sort((a, b) => a.localeCompare(b));
    
    sortedList.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      li.style.cursor = 'pointer';
      li.style.color = 'blue';
      li.style.textDecoration = 'underline';
      li.onclick = () => removeFromList(item, 'incognito');
      incognitoListElement.appendChild(li);
    });
  }
}

function removeFromList(item, listType) {
  const key = listType === 'block' ? 'blockList' : 'incognitoList';
  chrome.storage.sync.get({ [key]: [] }, (data) => {
    const updatedList = data[key].filter(domain => domain !== item);
    chrome.storage.sync.set({ [key]: updatedList }, () => {
      if (listType === 'block') {
        updateBlockListUI(updatedList);
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "domainUnblocked", 
            domain: item
          });
        });
      } else {
        updateIncognitoListUI(updatedList);
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "domainRemovedFromIncognito", 
            domain: item
          });
        });
      }
    });
  });
}

function initPopup() {
  console.log('Initializing popup');
  chrome.storage.sync.get({ 
    blockList: [], 
    incognitoList: [],
    iconSize: 'large', 
    isActive: true 
  }, (data) => {
    console.log('Retrieved data:', data);
    updateBlockListUI(data.blockList);
    updateIncognitoListUI(data.incognitoList);
    document.getElementById('iconSize').value = data.iconSize;
    document.getElementById('activeToggle').checked = data.isActive;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');
  initPopup();

  // Add event listener for icon size change
  document.getElementById('iconSize').addEventListener('change', (event) => {
    const newSize = event.target.value;
    chrome.storage.sync.set({ iconSize: newSize }, () => {
      console.log(`Icon size set to ${newSize}`);
      sendMessageToFarkTabs({action: "updateIconSize", size: newSize});
    });
  });

  // Add event listener for active toggle
  document.getElementById('activeToggle').addEventListener('change', (event) => {
    const isActive = event.target.checked;
    chrome.storage.sync.set({ isActive: isActive }, () => {
      console.log(`Extension active state set to ${isActive}`);
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "updateActiveState", 
          isActive: isActive
        });
      });
    });
  });
});

console.log('Popup script loaded');
