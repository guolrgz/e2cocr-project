document.addEventListener('DOMContentLoaded', async () => {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (apiKey) {
    document.getElementById('api-key').value = apiKey;
  }
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const apiKey = document.getElementById('api-key').value.trim();
  await chrome.storage.local.set({ apiKey });
  const status = document.getElementById('status-msg');
  status.textContent = 'Saved!';
  status.className = 'settings-status settings-status-ok';
  setTimeout(() => {
    status.textContent = '';
    status.className = 'settings-status';
  }, 2000);
});
