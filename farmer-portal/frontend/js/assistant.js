/** assistant.js - trilingual chat interface for the AI farmer assistant. */
document.addEventListener('DOMContentLoaded', () => {
  const log = document.getElementById('chat-log');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const chips = document.getElementById('suggestions');
  const badge = document.getElementById('mode-badge');

  const GREETING = {
    en: 'Namaste! I am the farmer assistant of this portal. Ask me about documents, procurement centres, procurement status, receipts, payments or government schemes.',
    hi: 'नमस्ते! मैं इस पोर्टल का किसान सहायक हूं। दस्तावेज, खरीद केंद्र, खरीद की स्थिति, रसीद, भुगतान या सरकारी योजनाओं के बारे में पूछिए।',
    mr: 'नमस्कार! मी या पोर्टलचा शेतकरी सहाय्यक आहे. कागदपत्रे, खरेदी केंद्रे, खरेदीची स्थिती, पावती, देयक किंवा सरकारी योजनांबद्दल विचारा.'
  };
  const PLACEHOLDER = {
    en: 'Type your question here',
    hi: 'अपना सवाल यहां लिखें',
    mr: 'तुमचा प्रश्न इथे लिहा'
  };

  let lang = 'en';
  let history = [];      // sent to the backend so a real AI model keeps context

  loadSuggestions();
  start();

  document.querySelectorAll('input[name="lang"]').forEach(radio => {
    radio.addEventListener('change', () => {
      lang = radio.value;
      input.placeholder = PLACEHOLDER[lang];
      history = [];
      start();
      loadSuggestions();
    });
  });

  document.getElementById('clear-chat').addEventListener('click', () => {
    history = [];
    start();
    UI.toast('Chat cleared.', 'success');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    ask(text);
  });

  function start() {
    log.innerHTML = '';
    addMessage('assistant', GREETING[lang]);
  }

  async function loadSuggestions() {
    try {
      const data = await API.get('/assistant/suggestions?lang=' + lang);
      badge.textContent = data.mode === 'ai' ? 'AI mode' : 'demo mode';
      badge.className = 'badge ' + (data.mode === 'ai' ? 'text-bg-success' : 'text-bg-light border');
      chips.innerHTML = data.suggestions.map(s =>
        `<button type="button" class="suggestion-chip">${UI.escapeHtml(s)}</button>`).join('');
      chips.querySelectorAll('.suggestion-chip').forEach(chip =>
        chip.addEventListener('click', () => ask(chip.textContent)));
    } catch (e) {
      chips.innerHTML = '';
    }
  }

  async function ask(text) {
    addMessage('user', text);
    const typing = addTyping();
    try {
      const data = await API.post('/assistant/chat', { message: text, lang, history });
      typing.remove();
      addMessage('assistant', data.reply);
      history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
      if (history.length > 10) history = history.slice(-10);
    } catch (e) {
      typing.remove();
      addMessage('assistant', e.message);
    }
  }

  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    el.innerHTML = `
      <div class="avatar"><i class="bi ${role === 'user' ? 'bi-person' : 'bi-robot'}"></i></div>
      <div>
        <div class="bubble">${UI.escapeHtml(text).replace(/\n/g, '<br>')}</div>
        <div class="chat-time">${time}</div>
      </div>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function addTyping() {
    const el = document.createElement('div');
    el.className = 'chat-msg assistant';
    el.innerHTML = `<div class="avatar"><i class="bi bi-robot"></i></div>
      <div class="bubble typing"><span></span><span></span><span></span></div>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
});
