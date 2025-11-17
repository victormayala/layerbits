document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('layerbits-toggle');
  if (!toggle) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;
    chrome.runtime.sendMessage({ type: 'LAYERBITS_GET_ENABLED' }, (resp) => {
      toggle.checked = !!resp?.enabled;
    });
  });

  toggle.addEventListener('change', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;
      chrome.runtime.sendMessage({ type: 'LAYERBITS_FORWARD_TOGGLE', tabId: tab.id, enabled: toggle.checked }, () => {
        // Close the popup after toggling
        setTimeout(() => {
          window.close();
        }, 100);
      });
    });
  });
});
