// Layerbits background: manages per-tab enabled state
let enabledTabIds = new Set();

function setEnabledForTab(tabId, enabled) {
  if (enabled) enabledTabIds.add(tabId); else enabledTabIds.delete(tabId);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'LAYERBITS_GET_ENABLED') {
    const tabId = sender?.tab?.id;
    sendResponse({ enabled: tabId ? enabledTabIds.has(tabId) : false });
    return true;
  }
  if (message?.type === 'LAYERBITS_SET_ENABLED') {
    const tabId = sender?.tab?.id;
    if (tabId) setEnabledForTab(tabId, !!message.enabled);
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === 'LAYERBITS_FORWARD_TOGGLE') {
    // Popup provides explicit tabId
    const tabId = message.tabId;
    if (tabId) setEnabledForTab(tabId, !!message.enabled);
    chrome.tabs.sendMessage(tabId, { type: 'LAYERBITS_TOGGLE', enabled: !!message.enabled });
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === 'LAYERBITS_COLOR_MODE') {
    // Forward color mode change to tab without global context menu
    const tabId = sender?.tab?.id;
    if (tabId) chrome.tabs.sendMessage(tabId, { type: 'LAYERBITS_COLOR_MODE', mode: message.mode });
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === 'LAYERBITS_CAPTURE') {
    // Capture visible area of current window/tab
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true, dataUrl });
      }
    });
    return true; // async response
  }
});
