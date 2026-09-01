/* ═══════════════════════════════════════════════════════════════
   CHATBOT IA — Marmolería Benjamín
   Lógica frontend: UI, historial en memoria, comunicación con Worker
   ═══════════════════════════════════════════════════════════════ */
'use strict';

(function initChatbot() {

  /* ─── Configuración ─── */
  const CHATBOT_API_URL = 'https://marmoleria-chatbot.chapigonz.workers.dev';
  const MAX_MESSAGE_LENGTH = 500;
  const MAX_HISTORY_PAIRS = 5; // Últimos 5 pares user/bot enviados al Worker
  const WHATSAPP_NUMBER = typeof window.WHATSAPP_NUMBER !== 'undefined'
    ? window.WHATSAPP_NUMBER
    : '5491144926814';
  const WA_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Quisiera hacer una consulta.')}`;

  /* ─── Estado ─── */
  let isOpen = false;
  let isWaiting = false;
  let hasShownWelcome = false;
  const history = []; // {role: 'user'|'assistant', content: string}

  /* ─── Elementos DOM ─── */
  const floatWrap   = document.getElementById('chatbot-float-wrap');
  const toggleBtn   = document.getElementById('chatbot-toggle');
  const bubbleEl    = document.getElementById('chatbot-bubble');
  const panel       = document.getElementById('chatbot-panel');
  const scrim       = document.getElementById('chatbot-scrim');
  const closeBtn    = document.getElementById('chatbot-close');
  const messagesEl  = document.getElementById('chatbot-messages');
  const typingEl    = document.getElementById('chatbot-typing');
  const quickEl     = document.getElementById('chatbot-quick-actions');
  const inputEl     = document.getElementById('chatbot-input');
  const sendBtn     = document.getElementById('chatbot-send');

  if (!toggleBtn || !panel || !messagesEl || !inputEl) return;

  /* ─── Mensaje de bienvenida ─── */
  const WELCOME_MSG = '¡Hola! 👋 Soy el asistente virtual de Marmolería Benjamín. Puedo ayudarte con información sobre nuestros materiales, trabajos, servicios y cómo contactarnos. ¿En qué puedo ayudarte?';

  /* ─── Botones rápidos ─── */
  const QUICK_ACTIONS = [
    { label: '¿Qué materiales trabajan?', message: '¿Qué materiales trabajan?' },
    { label: '¿Mesadas a medida?', message: '¿Hacen mesadas a medida?' },
    { label: '¿Qué trabajos realizan?', message: '¿Qué trabajos realizan?' },
    { label: 'Pedir presupuesto', message: '¿Cómo solicito un presupuesto?' },
    { label: '¿Dónde están?', message: '¿Dónde están ubicados?' },
    { label: 'Hablar por WhatsApp', wa: true },
  ];

  /* ═══ RENDERIZADO ════════════════════════════════════════════ */

  function renderQuickActions() {
    if (!quickEl) return;
    quickEl.innerHTML = QUICK_ACTIONS.map(a => {
      if (a.wa) {
        return `<a class="chatbot-quick-btn" href="${WA_LINK}" target="_blank" rel="noopener noreferrer">
          <svg class="chatbot-ico" viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z"/><path d="M9 8.6c.2 2.9 3.6 6.3 6.5 6.5l1.4-1.5-2.3-1.4-.9.9c-1-.5-2-1.4-2.4-2.4l.9-.9L9.8 7.5 9 8.6Z"/></svg>
          ${a.label}
        </a>`;
      }
      return `<button class="chatbot-quick-btn" data-msg="${escapeAttr(a.message)}">${a.label}</button>`;
    }).join('');
  }

  function addMessage(content, type) {
    const div = document.createElement('div');
    div.className = `chatbot-msg chatbot-msg--${type}`;

    if (type === 'bot' || type === 'error') {
      div.innerHTML = formatBotMessage(content);
    } else {
      div.textContent = content;
    }

    messagesEl.appendChild(div);

    if (type === 'bot' || type === 'error') {
      // Scrollear al inicio del nuevo mensaje del bot para que el usuario no tenga que subir
      setTimeout(() => {
        div.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    } else {
      scrollToBottom();
    }

    // Guardar en historial
    if (type === 'user') {
      history.push({ role: 'user', content });
    } else if (type === 'bot') {
      history.push({ role: 'assistant', content });
    }
  }

  function formatBotMessage(text) {
    if (!text) return '';

    let html = escapeHTML(text);

    // 1. Manejar markdown links existentes tipo [Texto](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, linkText, url) => {
      const cleanUrl = url.replace(/^[<"']|[>"']$/g, '');
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    });

    // 2. Convertir negritas markdown **texto** a <strong>texto</strong>
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Limpiar asteriscos sueltos que hayan quedado
    html = html.replace(/\*\*/g, '');

    // 3. Detectar URLs de wa.me sueltas (que no estén dentro de un href ya)
    html = html.replace(/(^|[^"'>])(https:\/\/wa\.me\/[0-9]+(?:\?[^\s<"']*)?)/g, (match, prefix, url) => {
      return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" style="font-weight:600;">📲 Contactar por WhatsApp</a>`;
    });

    // 4. Si el texto menciona WhatsApp pero no tiene ningún enlace, enlazar la palabra
    if (!html.includes('<a ') && /whatsapp/i.test(html)) {
      html = html.replace(/(WhatsApp)/gi, `<a href="${WA_LINK}" target="_blank" rel="noopener noreferrer">$1</a>`);
    }

    // 5. Convertir saltos de línea ordenados
    html = html.replace(/\n\s*\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  function showTyping() {
    if (typingEl) {
      typingEl.classList.add('is-active');
      scrollToBottom();
    }
  }

  function hideTyping() {
    if (typingEl) typingEl.classList.remove('is-active');
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function hideQuickActions() {
    if (quickEl) quickEl.style.display = 'none';
  }

  /* ═══ APERTURA / CIERRE ══════════════════════════════════════ */

  function openChat() {
    if (isOpen) return;
    isOpen = true;
    panel.classList.add('is-open');
    if (scrim) scrim.classList.add('is-open');
    if (floatWrap) floatWrap.classList.add('is-hidden');
    else toggleBtn.classList.add('is-hidden');
    toggleBtn.classList.remove('has-badge');
    document.body.style.overflow = window.innerWidth <= 640 ? 'hidden' : '';

    if (!hasShownWelcome) {
      hasShownWelcome = true;
      addMessage(WELCOME_MSG, 'bot');
      renderQuickActions();
    }

    setTimeout(() => inputEl.focus(), 350);
  }

  function closeChat() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');
    if (scrim) scrim.classList.remove('is-open');
    if (floatWrap) floatWrap.classList.remove('is-hidden');
    else toggleBtn.classList.remove('is-hidden');
    document.body.style.overflow = '';
  }

  /* ─── Event listeners de apertura / cierre ─── */
  toggleBtn.addEventListener('click', openChat);
  if (bubbleEl) {
    bubbleEl.addEventListener('click', openChat);
    bubbleEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openChat();
      }
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeChat);
  if (scrim) scrim.addEventListener('click', closeChat);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeChat();
  });

  /* ═══ ENVÍO DE MENSAJES ══════════════════════════════════════ */

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isWaiting) return;

    // Validar longitud
    const msg = trimmed.slice(0, MAX_MESSAGE_LENGTH);

    // Ocultar quick actions tras primer mensaje del usuario
    hideQuickActions();

    // Mostrar mensaje del usuario
    addMessage(msg, 'user');
    inputEl.value = '';
    inputEl.style.height = 'auto';
    updateSendState();

    // Indicador de carga
    isWaiting = true;
    updateSendState();
    showTyping();

    try {
      const response = await fetchWithTimeout(CHATBOT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: getRecentHistory()
        })
      }, 18000); // 18s timeout

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.reply || typeof data.reply !== 'string') {
        throw new Error('Respuesta inválida');
      }

      hideTyping();
      addMessage(data.reply, 'bot');

    } catch (err) {
      hideTyping();
      const errorMsg = getErrorMessage(err);
      addMessage(errorMsg, 'error');
    } finally {
      isWaiting = false;
      updateSendState();
    }
  }

  function getRecentHistory() {
    // Enviar solo los últimos N pares al Worker
    const pairs = MAX_HISTORY_PAIRS * 2;
    return history.slice(-pairs).map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  async function fetchWithTimeout(url, options, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  function getErrorMessage(err) {
    if (err.name === 'AbortError') {
      return `La consulta tardó demasiado. Podés intentar de nuevo o contactarnos directamente por <a href="${WA_LINK}" target="_blank" rel="noopener noreferrer">WhatsApp</a>.`;
    }
    if (!navigator.onLine) {
      return 'Parece que hay un problema de conexión. Verificá tu internet e intentá de nuevo.';
    }
    return `No pude procesar tu consulta en este momento. Podés contactarnos directamente por <a href="${WA_LINK}" target="_blank" rel="noopener noreferrer">WhatsApp</a>.`;
  }

  /* ═══ INPUT Y CONTROLES ══════════════════════════════════════ */

  // Enter para enviar
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputEl.value);
    }
  });

  // Botón enviar
  sendBtn.addEventListener('click', () => sendMessage(inputEl.value));

  // Quick actions
  if (quickEl) {
    quickEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-msg]');
      if (btn) sendMessage(btn.dataset.msg);
    });
  }

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    updateSendState();
  });

  function updateSendState() {
    const hasText = inputEl.value.trim().length > 0;
    sendBtn.disabled = !hasText || isWaiting;
  }

  // Longitud máxima visual
  inputEl.addEventListener('input', () => {
    if (inputEl.value.length > MAX_MESSAGE_LENGTH) {
      inputEl.value = inputEl.value.slice(0, MAX_MESSAGE_LENGTH);
    }
  });

  /* ═══ VISIBILIDAD DEL BOTÓN ══════════════════════════════════ */
  // Mostrar el botón después de que el usuario haya scrolleado un poco (reutilizando la lógica del WA float)
  function updateChatbotVisibility() {
    const target = floatWrap || toggleBtn;
    const sec = document.getElementById('materiales');
    if (!sec) {
      target.classList.add('is-visible');
      return;
    }
    const r = sec.getBoundingClientRect();
    target.classList.toggle('is-visible', r.top <= window.innerHeight * 0.8);
  }

  // Hookear al scroll existente
  window.addEventListener('scroll', updateChatbotVisibility, { passive: true });
  window.addEventListener('load', updateChatbotVisibility);
  updateChatbotVisibility();

  /* ═══ UTILIDADES ═════════════════════════════════════════════ */

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

})();
