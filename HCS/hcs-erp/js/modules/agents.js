/* ================================================================
   HCS ERP — agents.js
   Module Agents IA : dashboard des 8 agents HCS, interface chat,
   historique des sessions
   ================================================================ */

'use strict';

const Agents = (() => {

  /* ----------------------------------------------------------------
     CONFIGURATION DES 8 AGENTS HCS
     Chaque agent a un id Anthropic, un rôle et un system prompt dédié
     ---------------------------------------------------------------- */
  const AGENTS_LIST = [
    {
      id:    'agent_011Ca1i2FzUX3zNd4xuM4PHa',
      nom:   'HCS-Atelier',
      role:  'Responsable Production',
      icon:  '⚙️',
      color: '#FF6B6B',
      modele:'claude-sonnet-4-6',
      statut:'actif',
      description: 'Gestion des ordres de fabrication, planning atelier, DTF et vinyle.',
      systemPrompt: `Tu es HCS-Atelier, l'agent IA de production de High Coffee Shirt (HCS) à Papeete, Tahiti.
Tu gères les ordres de fabrication, le planning de l'atelier, les impressions DTF et le vinyl.
Réponds toujours en français, de façon concise et opérationnelle.
Monnaie : XPF (franc CFP).`
    },
    {
      id:    'agent_011Ca1i5Lk4BaMSRTMCtdkjk',
      nom:   'HCS-Commercial',
      role:  'Agent Commercial',
      icon:  '🤝',
      color: '#4A5FFF',
      modele:'claude-sonnet-4-6',
      statut:'actif',
      description: 'Devis, suivi clients, pipeline commercial et relances.',
      systemPrompt: `Tu es HCS-Commercial, l'agent IA commercial de High Coffee Shirt (HCS) à Papeete, Tahiti.
Tu gères les devis, le suivi clients, le pipeline commercial et les relances.
Réponds toujours en français, de façon commerciale et professionnelle.
Monnaie : XPF (franc CFP).`
    },
    {
      id:    'agent_011Ca1i5QZW9BuYFmAEUbrt3',
      nom:   'HCS-Marketing',
      role:  'Responsable Marketing',
      icon:  '📢',
      color: '#B07BFF',
      modele:'claude-sonnet-4-6',
      statut:'actif',
      description: 'Campagnes, réseaux sociaux, contenu et stratégie de marque MANAWEAR.',
      systemPrompt: `Tu es HCS-Marketing, l'agent IA marketing de High Coffee Shirt (HCS) / MANAWEAR à Papeete, Tahiti.
Tu gères les campagnes, les réseaux sociaux, le contenu et la stratégie de marque.
Réponds toujours en français, avec créativité et sens du branding polynésien.`
    },
    {
      id:    'agent_011Ca1i5TrwZCPHXnqW8EjqM',
      nom:   'HCS-Support',
      role:  'Support Client',
      icon:  '🎧',
      color: '#00D4AA',
      modele:'claude-sonnet-4-6',
      statut:'actif',
      description: 'Assistance clients, suivi commandes, réclamations et SAV.',
      systemPrompt: `Tu es HCS-Support, l'agent IA support de High Coffee Shirt (HCS) à Papeete, Tahiti.
Tu gères l'assistance clients, le suivi des commandes, les réclamations et le SAV.
Réponds toujours en français, avec bienveillance et efficacité.
Monnaie : XPF (franc CFP).`
    },
    {
      id:    'agent_011Ca1i5WyDUg2fQCJSUzWq5',
      nom:   'HCS-Finance',
      role:  'Analyste Financier',
      icon:  '💰',
      color: '#F59E0B',
      modele:'claude-sonnet-4-6',
      statut:'actif',
      description: 'Comptabilité, trésorerie, TVA, rapports financiers en XPF.',
      systemPrompt: `Tu es HCS-Finance, l'agent IA financier de High Coffee Shirt (HCS) à Papeete, Tahiti, Polynésie française.
Tu gères la comptabilité, la trésorerie, la TVA et les rapports financiers.
Réponds toujours en français. TOUJOURS afficher les montants en XPF (franc CFP).
TVA en Polynésie : 16%. Taux de change USD/XPF : environ 110.`
    },
    {
      id:    'agent_011Ca1i5a41GExc8u42YVC4y',
      nom:   'HCS-Logistique',
      role:  'Responsable Logistique',
      icon:  '📦',
      color: '#6B7280',
      modele:'claude-sonnet-4-6',
      statut:'actif',
      description: 'Stock, fournisseurs, commandes achat, expéditions et réceptions.',
      systemPrompt: `Tu es HCS-Logistique, l'agent IA logistique de High Coffee Shirt (HCS) à Papeete, Tahiti.
Tu gères le stock, les fournisseurs, les commandes achat, les expéditions et les réceptions.
Réponds toujours en français, de façon précise et organisée.
Monnaie : XPF (franc CFP).`
    },
    {
      id:    'agent_011Ca1i5cqgmXC8pfK6n8YvJ',
      nom:   'HCS-Music',
      role:  'Agent Créatif',
      icon:  '🎵',
      color: '#EC4899',
      modele:'claude-sonnet-4-6',
      statut:'actif',
      description: 'Projets musicaux, créations artistiques et contenu culturel polynésien.',
      systemPrompt: `Tu es HCS-Music, l'agent IA créatif de High Coffee Shirt (HCS) à Papeete, Tahiti.
Tu gères les projets musicaux, les créations artistiques et le contenu culturel polynésien.
Réponds toujours en français, avec créativité et sensibilité culturelle ma'ohi.`
    },
    {
      id:    'agent_011Ca1i5g4QWANXkWTS8FCDT',
      nom:   'HCS-Orchestrateur',
      role:  'Orchestrateur Multi-Agents',
      icon:  '⬡',
      color: '#4A5FFF',
      modele:'claude-opus-4-6',
      statut:'actif',
      description: 'Coordination de tous les agents, tâches complexes multi-domaines.',
      systemPrompt: `Tu es HCS-Orchestrateur, l'agent IA principal de High Coffee Shirt (HCS) à Papeete, Tahiti, Polynésie française.
Tu coordonnes tous les agents HCS et tu traites les tâches complexes multi-domaines.
Tu as une vision globale de l'entreprise : production, commercial, finance, logistique, marketing et support.
Réponds toujours en français. Monnaie : XPF (franc CFP).`
    }
  ];

  /* Clés de stockage localStorage */
  const STORAGE_KEY_API  = 'hcs_agents_api_key';
  const STORAGE_KEY_SESS = 'hcs_agents_sessions';

  /* État interne du module */
  let _currentAgent  = null;  // agent sélectionné pour le chat
  let _chatHistory   = [];    // historique messages du chat actif
  let _sessions      = [];    // toutes les sessions sauvegardées
  let _container     = null;  // référence au conteneur principal

  /* ----------------------------------------------------------------
     ENTRÉE PUBLIQUE : init(toolbarEl, containerEl, view)
     Appelé par app.js → renderView() à chaque changement de vue
     ---------------------------------------------------------------- */
  function init(toolbarEl, containerEl, view) {
    _container = containerEl;

    /* Charger les sessions depuis localStorage */
    _loadSessions();

    /* Rendre la toolbar selon la vue */
    _renderToolbar(toolbarEl, view);

    /* Dispatcher vers la bonne vue */
    switch (view) {
      case 'chat':      _renderChat(containerEl);     break;
      case 'sessions':  _renderSessions(containerEl); break;
      default:          _renderDashboard(containerEl);
    }
  }

  /* ================================================================
     VUE 1 — DASHBOARD : grille des 8 agents
     ================================================================ */
  function _renderDashboard(el) {
    el.innerHTML = `
      <div class="agents-dashboard">
        <div class="agents-header">
          <h2 class="agents-title">⬡ Agents IA HCS</h2>
          <p class="agents-subtitle">8 agents spécialisés propulsés par Claude Anthropic</p>
        </div>
        <div class="agents-grid">
          ${AGENTS_LIST.map(agent => _cardAgent(agent)).join('')}
        </div>
      </div>
    `;

    /* Liaison des boutons "Parler" */
    el.querySelectorAll('.btn-agent-chat').forEach(btn => {
      btn.addEventListener('click', () => {
        const agentId = btn.dataset.agentId;
        /* Sélectionner l'agent et aller dans la vue chat */
        _selectAgent(agentId);
        openView('chat'); // router global app.js
      });
    });
  }

  /** Génère la carte HTML d'un agent */
  function _cardAgent(agent) {
    const statutClass = agent.statut === 'actif' ? 'statut-actif' : 'statut-inactif';
    const statutLabel = agent.statut === 'actif' ? '● Actif' : '○ Inactif';
    return `
      <div class="agent-card" data-agent-id="${agent.id}" style="--agent-color:${agent.color}">
        <div class="agent-card-header">
          <span class="agent-icon">${agent.icon}</span>
          <div class="agent-info">
            <span class="agent-nom">${_esc(agent.nom)}</span>
            <span class="agent-role">${_esc(agent.role)}</span>
          </div>
          <span class="agent-statut ${statutClass}">${statutLabel}</span>
        </div>
        <p class="agent-description">${_esc(agent.description)}</p>
        <div class="agent-card-footer">
          <span class="agent-modele">🤖 ${_esc(agent.modele)}</span>
          <button class="btn btn-primary btn-sm btn-agent-chat" data-agent-id="${agent.id}">
            💬 Parler
          </button>
        </div>
      </div>
    `;
  }

  /* ================================================================
     VUE 2 — CHAT : interface de conversation avec un agent
     ================================================================ */
  function _renderChat(el) {
    const agent = _currentAgent || AGENTS_LIST[0];
    const apiKey = localStorage.getItem(STORAGE_KEY_API) || '';

    el.innerHTML = `
      <div class="agents-chat-layout">

        <!-- Panneau latéral : sélection agent + clé API -->
        <aside class="chat-sidebar">
          <div class="chat-sidebar-section">
            <label class="form-label">Clé API Anthropic</label>
            <div class="api-key-wrap">
              <input type="password" id="agents-api-key" class="form-input"
                placeholder="sk-ant-…"
                value="${_esc(apiKey)}"
                autocomplete="off" />
              <button class="btn btn-ghost btn-sm" id="btn-save-key" title="Sauvegarder">💾</button>
            </div>
            <p class="form-hint">Stockée localement dans votre navigateur.</p>
          </div>

          <div class="chat-sidebar-section">
            <label class="form-label">Agent</label>
            <div class="agent-select-list">
              ${AGENTS_LIST.map(a => `
                <button class="agent-select-item ${a.id === agent.id ? 'active' : ''}"
                  data-agent-id="${a.id}"
                  style="--agent-color:${a.color}">
                  <span class="agent-select-icon">${a.icon}</span>
                  <span class="agent-select-nom">${_esc(a.nom)}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <button class="btn btn-ghost btn-sm btn-clear-chat" id="btn-clear-chat">
            🗑 Effacer le chat
          </button>
        </aside>

        <!-- Zone principale de chat -->
        <div class="chat-main">
          <div class="chat-agent-banner" style="border-left:4px solid ${agent.color}">
            <span class="chat-agent-icon">${agent.icon}</span>
            <div>
              <strong>${_esc(agent.nom)}</strong>
              <span class="chat-agent-role">${_esc(agent.role)}</span>
            </div>
            <span class="agent-statut statut-actif" style="margin-left:auto">● Actif</span>
          </div>

          <!-- Messages -->
          <div class="chat-messages" id="chat-messages">
            ${_chatHistory.length === 0
              ? `<div class="chat-empty">
                   <span style="font-size:2rem">${agent.icon}</span>
                   <p>Bonjour ! Je suis <strong>${_esc(agent.nom)}</strong>.<br>${_esc(agent.description)}<br><em>Comment puis-je vous aider ?</em></p>
                 </div>`
              : _chatHistory.map(m => _renderMessage(m)).join('')
            }
          </div>

          <!-- Zone de saisie -->
          <div class="chat-input-zone">
            <textarea id="chat-input" class="chat-textarea"
              placeholder="Écrivez votre message… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
              rows="2"></textarea>
            <button class="btn btn-primary" id="btn-send-chat">
              ➤ Envoyer
            </button>
          </div>

          <p id="chat-error" class="chat-error" style="display:none"></p>
        </div>
      </div>
    `;

    /* ---- Liaisons événements ---- */

    /* Sauvegarde de la clé API */
    el.querySelector('#btn-save-key').addEventListener('click', () => {
      const key = el.querySelector('#agents-api-key').value.trim();
      localStorage.setItem(STORAGE_KEY_API, key);
      _showToast('Clé API sauvegardée', 'success');
    });

    /* Sélection d'un autre agent */
    el.querySelectorAll('.agent-select-item').forEach(btn => {
      btn.addEventListener('click', () => {
        _selectAgent(btn.dataset.agentId);
        _chatHistory = []; // réinitialise l'historique au changement d'agent
        _renderChat(el);
      });
    });

    /* Effacer le chat */
    el.querySelector('#btn-clear-chat').addEventListener('click', () => {
      _chatHistory = [];
      _renderChat(el);
    });

    /* Envoi du message (bouton) */
    el.querySelector('#btn-send-chat').addEventListener('click', () => _sendMessage(el));

    /* Envoi du message (Entrée sans Maj) */
    el.querySelector('#chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        _sendMessage(el);
      }
    });

    /* Scroll en bas */
    _scrollToBottom();
  }

  /** Rendu d'un message dans le chat */
  function _renderMessage(msg) {
    const isUser = msg.role === 'user';
    return `
      <div class="chat-message ${isUser ? 'msg-user' : 'msg-agent'}">
        <div class="msg-bubble">
          <div class="msg-content">${_formatMarkdown(msg.content)}</div>
          <div class="msg-meta">${_esc(msg.time || '')}</div>
        </div>
      </div>
    `;
  }

  /** Envoie un message à l'API Anthropic */
  async function _sendMessage(el) {
    const input    = el.querySelector('#chat-input');
    const errorEl  = el.querySelector('#chat-error');
    const sendBtn  = el.querySelector('#btn-send-chat');
    const text     = input ? input.value.trim() : '';

    if (!text) return;

    /* Vérifier la clé API */
    const apiKey = localStorage.getItem(STORAGE_KEY_API) || '';
    if (!apiKey) {
      _showError(errorEl, '⚠️ Veuillez saisir et sauvegarder votre clé API Anthropic.');
      return;
    }

    const agent = _currentAgent || AGENTS_LIST[0];

    /* Ajouter le message utilisateur à l'historique */
    _chatHistory.push({
      role:    'user',
      content: text,
      time:    _now()
    });

    /* Vider le champ et désactiver le bouton */
    input.value = '';
    sendBtn.disabled  = true;
    sendBtn.textContent = '⏳ En cours…';
    _showError(errorEl, '');

    /* Rafraîchir l'affichage avec le message utilisateur */
    _updateMessages(el);

    try {
      /* Construire les messages pour l'API (sans le champ 'time' qui n'est pas attendu) */
      const apiMessages = _chatHistory
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      /* Appel à l'API Anthropic */
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':         'application/json',
          'x-api-key':             apiKey,
          'anthropic-version':     '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model:      agent.modele === 'claude-opus-4-6'
                        ? 'claude-opus-4-6'
                        : 'claude-sonnet-4-6',
          max_tokens: 1024,
          system:     agent.systemPrompt,
          messages:   apiMessages
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Erreur HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.content?.[0]?.text || '(réponse vide)';

      /* Ajouter la réponse de l'agent */
      _chatHistory.push({
        role:    'assistant',
        content: reply,
        time:    _now()
      });

      /* Sauvegarder la session */
      _saveSession(agent, text, reply);

    } catch (err) {
      _showError(errorEl, `❌ ${err.message}`);
      /* Retirer le message utilisateur en cas d'erreur */
      _chatHistory.pop();
    } finally {
      sendBtn.disabled    = false;
      sendBtn.textContent = '➤ Envoyer';
      _updateMessages(el);
      _scrollToBottom();
    }
  }

  /** Met à jour uniquement la zone de messages sans recréer toute la vue */
  function _updateMessages(el) {
    const agent    = _currentAgent || AGENTS_LIST[0];
    const messagesEl = el.querySelector('#chat-messages');
    if (!messagesEl) return;

    if (_chatHistory.length === 0) {
      messagesEl.innerHTML = `
        <div class="chat-empty">
          <span style="font-size:2rem">${agent.icon}</span>
          <p>Bonjour ! Je suis <strong>${_esc(agent.nom)}</strong>.<br>${_esc(agent.description)}<br><em>Comment puis-je vous aider ?</em></p>
        </div>`;
    } else {
      messagesEl.innerHTML = _chatHistory.map(m => _renderMessage(m)).join('');
    }
    _scrollToBottom();
  }

  /* ================================================================
     VUE 3 — SESSIONS : liste des sessions de chat sauvegardées
     ================================================================ */
  function _renderSessions(el) {
    _loadSessions();

    if (_sessions.length === 0) {
      el.innerHTML = `
        <div class="agents-sessions">
          <div class="agents-header">
            <h2 class="agents-title">📋 Sessions Agents IA</h2>
          </div>
          <div class="table-empty">
            <p>Aucune session enregistrée.<br>Commencez par parler à un agent dans la vue <strong>Chat</strong>.</p>
          </div>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="agents-sessions">
        <div class="agents-header">
          <h2 class="agents-title">📋 Sessions Agents IA</h2>
          <button class="btn btn-ghost btn-sm" id="btn-clear-sessions">🗑 Tout supprimer</button>
        </div>
        <div class="sessions-list">
          <table class="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Premier message</th>
                <th>Réponse</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${_sessions.slice().reverse().map(s => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span>${_esc(s.agentIcon || '⬡')}</span>
                      <strong>${_esc(s.agentNom)}</strong>
                    </div>
                  </td>
                  <td class="session-preview">${_esc(_truncate(s.userMsg, 60))}</td>
                  <td class="session-preview">${_esc(_truncate(s.agentReply, 60))}</td>
                  <td style="white-space:nowrap;font-size:12px;color:var(--text-muted)">${_esc(s.date)}</td>
                  <td><span class="badge badge-success">Terminée</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    /* Bouton suppression de toutes les sessions */
    const btnClear = el.querySelector('#btn-clear-sessions');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('Supprimer toutes les sessions ?')) {
          _sessions = [];
          _saveSessions();
          _renderSessions(el);
        }
      });
    }
  }

  /* ================================================================
     TOOLBAR
     ================================================================ */
  function _renderToolbar(toolbarEl, view) {
    if (!toolbarEl) return;
    toolbarEl.innerHTML = '';

    if (view === 'chat' || view === 'dashboard') {
      /* Bouton "Nouvelle conversation" dans le chat */
      if (view === 'chat') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-sm';
        btn.textContent = '+ Nouvelle conversation';
        btn.addEventListener('click', () => {
          _chatHistory = [];
          if (_container) _renderChat(_container);
        });
        toolbarEl.appendChild(btn);
      }
    }
  }

  /* ================================================================
     UTILITAIRES INTERNES
     ================================================================ */

  /** Sélectionne l'agent courant par son ID */
  function _selectAgent(agentId) {
    _currentAgent = AGENTS_LIST.find(a => a.id === agentId) || AGENTS_LIST[0];
  }

  /** Charge les sessions depuis localStorage */
  function _loadSessions() {
    try {
      _sessions = JSON.parse(localStorage.getItem(STORAGE_KEY_SESS) || '[]');
    } catch {
      _sessions = [];
    }
  }

  /** Persiste les sessions dans localStorage */
  function _saveSessions() {
    localStorage.setItem(STORAGE_KEY_SESS, JSON.stringify(_sessions));
  }

  /** Sauvegarde une nouvelle session après un échange */
  function _saveSession(agent, userMsg, agentReply) {
    _sessions.push({
      agentId:    agent.id,
      agentNom:   agent.nom,
      agentIcon:  agent.icon,
      userMsg,
      agentReply,
      date:       _now()
    });
    /* Garder les 100 dernières sessions */
    if (_sessions.length > 100) _sessions = _sessions.slice(-100);
    _saveSessions();
  }

  /** Scroll automatique vers le bas de la zone messages */
  function _scrollToBottom() {
    setTimeout(() => {
      const zone = document.getElementById('chat-messages');
      if (zone) zone.scrollTop = zone.scrollHeight;
    }, 50);
  }

  /** Affiche un message d'erreur dans la zone dédiée */
  function _showError(el, msg) {
    if (!el) return;
    el.textContent  = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  /** Affiche un toast via le composant global si disponible */
  function _showToast(msg, type = 'info') {
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(msg, type);
    }
  }

  /** Heure courante formatée */
  function _now() {
    return new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  /** Tronque une chaîne */
  function _truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  /** Échappe le HTML pour éviter les injections XSS */
  function _esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Convertit un texte Markdown minimal en HTML sécurisé.
   * Gère : **gras**, *italique*, `code`, sauts de ligne.
   * Le contenu est d'abord échappé puis les balises Markdown sont appliquées.
   */
  function _formatMarkdown(text) {
    if (!text) return '';
    let s = _esc(text);
    // Blocs de code ```
    s = s.replace(/```([\s\S]*?)```/g, '<pre class="msg-code">$1</pre>');
    // Code inline
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Gras
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italique
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Sauts de ligne → <br>
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  /* ----------------------------------------------------------------
     API PUBLIQUE
     ---------------------------------------------------------------- */
  return { init };

})();
