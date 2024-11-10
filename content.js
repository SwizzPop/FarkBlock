let globalBlockList = [];
let globalIncognitoList = [];
let currentIconSize = 'large';
let isActive = true;

function getIconSize(size) {
  switch(size) {
    case 'small': return '8px';
    case 'medium': return '12px';
    case 'large': return '16px';
    default: return '16px';
  }
}

function hideBlockedRows() {
  const rows = document.querySelectorAll('tr.headlineRow');
  rows.forEach(row => {
    const link = row.querySelector('a[data-farkdomain]');
    if (link) {
      const domain = link.getAttribute('data-farkdomain');
      if (globalBlockList.includes(domain)) {
        row.style.display = 'none';
      } else {
        row.style.display = '';
        ensureOneBlockIcon(row, domain);
      }
    }
  });
}

function ensureOneBlockIcon(row, domain) {
  const existingBlockIcons = row.querySelectorAll('.fark-block-icon');
  existingBlockIcons.forEach(icon => icon.remove());
  
  const existingIncognitoIcons = row.querySelectorAll('.fark-incognito-icon');
  existingIncognitoIcons.forEach(icon => icon.remove());
  
  addIncognitoIcon(row, domain);
  addBlockIcon(row, domain);
}

function addBlockIcon(row, domain) {
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('resources/x.png');
  img.className = 'fark-block-icon';
  img.style.cursor = 'pointer';
  img.style.marginRight = '5px';
  img.style.width = getIconSize(currentIconSize);
  img.style.height = getIconSize(currentIconSize);
  img.style.display = isActive ? '' : 'none';
  img.title = 'Block this domain.';

  img.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!globalBlockList.includes(domain)) {
      globalBlockList.push(domain);
      chrome.storage.sync.set({ blockList: globalBlockList }, () => {
        console.log(`Added ${domain} to block list`);
        showToast(`${domain} blocked`);
        processRows();
      });
    }
  });

  const sourceImageCell = row.querySelector('.headlineSourceImage');
  if (sourceImageCell) {
    sourceImageCell.insertBefore(img, sourceImageCell.firstChild);
  }
}

function addIncognitoIcon(row, domain) {
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('resources/incognito.png');
  img.className = 'fark-incognito-icon';
  img.style.cursor = 'pointer';
  img.style.marginRight = '5px';
  img.style.width = getIconSize(currentIconSize);
  img.style.height = getIconSize(currentIconSize);
  img.style.display = isActive ? '' : 'none';
  img.title = 'Open all links Incognito.';

  img.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!globalIncognitoList.includes(domain)) {
      globalIncognitoList.push(domain);
      try {
        await chrome.storage.sync.set({ incognitoList: globalIncognitoList });
        console.log(`Added ${domain} to incognito list:`, globalIncognitoList);
        showToast(`${domain} will open in incognito mode`);
        
        // Immediately update the link behavior
        const row = event.target.closest('tr.headlineRow');
        const link = row.querySelector('a[data-farkdomain]');
        if (link) {
          // Remove any existing click listeners
          const newLink = link.cloneNode(true);
          link.parentNode.replaceChild(newLink, link);
          
          newLink.addEventListener('click', (e) => {
            e.preventDefault();
            const href = newLink.getAttribute('href');
            chrome.runtime.sendMessage({
              action: "openIncognito",
              url: href
            });
          });
        }

        // Notify the popup to update if it's open
        chrome.runtime.sendMessage({
          action: "updateIncognitoList",
          incognitoList: globalIncognitoList
        }).catch(() => {
          // Ignore error if popup is not open
        });
      } catch (error) {
        console.error('Error saving incognito list:', error);
      }
    }
  });

  const sourceImageCell = row.querySelector('.headlineSourceImage');
  if (sourceImageCell) {
    sourceImageCell.insertBefore(img, sourceImageCell.firstChild);
  }
}

function processRows() {
  const rows = document.querySelectorAll('tr.headlineRow');
  rows.forEach(row => {
    const link = row.querySelector('a[data-farkdomain]');
    if (link) {
      const domain = link.getAttribute('data-farkdomain');
      
      // Handle blocked domains
      if (globalBlockList.includes(domain)) {
        row.style.display = 'none';
        return;
      }
      
      row.style.display = '';
      ensureOneBlockIcon(row, domain);
      
      // Handle incognito domains
      if (globalIncognitoList.includes(domain)) {
        // Remove any existing click listeners
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        newLink.addEventListener('click', (event) => {
          event.preventDefault();
          const href = newLink.getAttribute('href');
          chrome.runtime.sendMessage({
            action: "openIncognito",
            url: href
          });
        });
      }
    }
  });
}

function initializeLists() {
  chrome.storage.sync.get({ 
    blockList: [], 
    incognitoList: [],
    iconSize: 'large', 
    isActive: true 
  }, (data) => {
    console.log('Initializing lists:', data);
    globalBlockList = data.blockList;
    globalIncognitoList = data.incognitoList || [];
    currentIconSize = data.iconSize;
    isActive = data.isActive;
    processRows();
  });
}

function handleNewHeadlines(addedNode) {
  if (addedNode.nodeType === Node.ELEMENT_NODE) {
    const newRows = addedNode.querySelectorAll('tr.headlineRow');
    newRows.forEach(row => {
      const link = row.querySelector('a[data-farkdomain]');
      if (link) {
        const domain = link.getAttribute('data-farkdomain');
        if (globalBlockList.includes(domain)) {
          row.style.display = 'none';
        } else {
          ensureOneBlockIcon(row, domain);
        }
      }
    });
  }
}

function updateIconSize(size) {
  currentIconSize = size;
  const icons = document.querySelectorAll('.fark-block-icon');
  icons.forEach(icon => {
    icon.style.width = getIconSize(size);
    icon.style.height = getIconSize(size);
  });
}

function updateActiveState(active) {
  isActive = active;
  const blockIcons = document.querySelectorAll('.fark-block-icon');
  const incognitoIcons = document.querySelectorAll('.fark-incognito-icon');
  
  blockIcons.forEach(icon => {
    icon.style.display = active ? '' : 'none';
  });
  
  incognitoIcons.forEach(icon => {
    icon.style.display = active ? '' : 'none';
  });
}

function showToast(message) {
  // Create toast if it doesn't exist
  let toast = document.getElementById('farkblock-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'farkblock-toast';
    toast.style.visibility = 'hidden';
    toast.style.minWidth = '200px';
    toast.style.backgroundColor = '#333';
    toast.style.color = '#fff';
    toast.style.textAlign = 'center';
    toast.style.borderRadius = '5px';
    toast.style.padding = '16px';
    toast.style.position = 'fixed';
    toast.style.zIndex = '1000';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    document.body.appendChild(toast);
  }

  // Show the toast
  toast.textContent = message;
  toast.style.visibility = 'visible';
  toast.style.animation = 'none';
  toast.offsetHeight; // Trigger reflow
  toast.style.animation = 'fadein 0.5s, fadeout 0.5s 2.5s';

  // Hide the toast after animation
  setTimeout(() => {
    toast.style.visibility = 'hidden';
  }, 3000);
}

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadein {
    from {bottom: 0; opacity: 0;}
    to {bottom: 30px; opacity: 1;}
  }

  @keyframes fadeout {
    from {bottom: 30px; opacity: 1;}
    to {bottom: 0; opacity: 0;}
  }
`;
document.head.appendChild(style);

initializeLists();

// Listen for changes to the DOM (new content being loaded)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(handleNewHeadlines);
    }
  });
});

// Observe the entire document body
observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "domainUnblocked") {
    console.log(`Domain unblocked: ${request.domain}`);
    globalBlockList = globalBlockList.filter(domain => domain !== request.domain);
    processRows();
  } else if (request.action === "domainRemovedFromIncognito") {
    console.log(`Domain removed from incognito: ${request.domain}`);
    globalIncognitoList = globalIncognitoList.filter(domain => domain !== request.domain);
    
    // Immediately update all links for this domain
    const rows = document.querySelectorAll('tr.headlineRow');
    rows.forEach(row => {
      const link = row.querySelector(`a[data-farkdomain="${request.domain}"]`);
      if (link) {
        // Remove incognito behavior by replacing with a fresh link
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
      }
    });
  } else if (request.action === "updateIconSize") {
    console.log(`Updating icon size to ${request.size}`);
    updateIconSize(request.size);
  } else if (request.action === "updateActiveState") {
    console.log(`Updating active state to ${request.isActive}`);
    updateActiveState(request.isActive);
  }
});
