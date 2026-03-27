// SnapWord - Word List Page

document.addEventListener('DOMContentLoaded', () => {
  loadWords();
});

// Listen for storage changes (live update)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.words) {
    renderWords(changes.words.newValue || []);
  }
});

async function loadWords() {
  const { words = [] } = await chrome.storage.local.get('words');
  renderWords(words);
}

function sortWords(words) {
  const pinned = words.filter((w) => w.pinned).sort((a, b) => b.createdAt - a.createdAt);
  const unpinned = words.filter((w) => !w.pinned).sort((a, b) => b.createdAt - a.createdAt);
  return [...pinned, ...unpinned];
}

function renderWords(words) {
  const grid = document.getElementById('word-grid');
  const emptyState = document.getElementById('empty-state');
  const countEl = document.getElementById('word-count');

  grid.innerHTML = '';

  if (words.length === 0) {
    emptyState.style.display = 'block';
    grid.style.display = 'none';
    countEl.textContent = '';
    return;
  }

  emptyState.style.display = 'none';
  grid.style.display = 'grid';
  countEl.textContent = words.length + ' word' + (words.length > 1 ? 's' : '');

  const sorted = sortWords(words);
  sorted.forEach((word) => {
    grid.appendChild(createCard(word));
  });
}

function createCard(word) {
  const card = document.createElement('div');
  card.className = 'wl-card' + (word.pinned ? ' wl-card-pinned' : '');
  card.dataset.id = word.id;

  card.innerHTML = `
    <div class="wl-card-top">
      <div class="wl-card-main">
        <span class="wl-card-word">${esc(word.word)}</span>
        ${word.pos ? `<span class="wl-card-pos">${esc(word.pos)}</span>` : ''}
      </div>
      <div class="wl-card-actions">
        <button class="wl-btn-pin" title="${word.pinned ? 'Unpin' : 'Pin to top'}">${word.pinned ? '\u2605' : '\u2606'}</button>
        <button class="wl-btn-delete" title="Delete">\u00d7</button>
      </div>
    </div>
    <div class="wl-card-translation">${esc(word.translation)}</div>
    ${word.example ? `
      <div class="wl-card-example">
        <div class="wl-card-example-en">${esc(word.example)}</div>
        ${word.exampleCn ? `<div class="wl-card-example-cn">${esc(word.exampleCn)}</div>` : ''}
      </div>
    ` : ''}
  `;

  card.querySelector('.wl-btn-pin').addEventListener('click', () => togglePin(word.id));
  card.querySelector('.wl-btn-delete').addEventListener('click', () => deleteWord(word.id));

  return card;
}

async function togglePin(id) {
  const { words = [] } = await chrome.storage.local.get('words');
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return;
  words[idx].pinned = !words[idx].pinned;
  await chrome.storage.local.set({ words });
  renderWords(words);
}

async function deleteWord(id) {
  const { words = [] } = await chrome.storage.local.get('words');
  const filtered = words.filter((w) => w.id !== id);
  await chrome.storage.local.set({ words: filtered });
  renderWords(filtered);
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
