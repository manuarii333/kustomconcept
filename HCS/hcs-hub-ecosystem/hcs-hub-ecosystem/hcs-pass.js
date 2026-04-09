/* ═══════════════════════════════════════════════════════════════
   HCS PASS — Module crédit prépayé rechargeable
   ═══════════════════════════════════════════════════════════════
   Usage :
     <script src="hcs-pass.js"></script>
     HCSPass.getBalance()          → number (XPF)
     HCSPass.credit(5000, 'Recharge')
     HCSPass.debit(1500, 'Atelier 1h')
     HCSPass.getHistory()          → [{date,label,amount,type,balance}]
     HCSPass.getSuggestion()       → string|null (passerelle V6)

   Stockage : localStorage 'hcs_pass' (partagé sur même domaine)
   ═══════════════════════════════════════════════════════════════ */

(function(global) {
  'use strict';

  const KEY = 'hcs_pass';
  const BONUS_RATE = 0.05; // +5% à chaque rechargement

  function _load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { balance: 0, history: [], totalReloaded: 0 }; }
    catch { return { balance: 0, history: [], totalReloaded: 0 }; }
  }

  function _save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function _entry(label, amount, type, balance) {
    return { date: new Date().toISOString(), label, amount, type, balance };
  }

  const HCSPass = {

    getBalance() {
      return _load().balance;
    },

    getHistory() {
      return _load().history || [];
    },

    getTotalReloaded() {
      return _load().totalReloaded || 0;
    },

    /* Crédite le Pass (rechargement + bonus) */
    credit(amount, label = 'Rechargement') {
      const data = _load();
      const bonus = Math.round(amount * BONUS_RATE);
      const total = amount + bonus;
      data.balance += total;
      data.totalReloaded = (data.totalReloaded || 0) + amount;
      data.history.unshift(_entry(label + (bonus ? ` (+${bonus.toLocaleString('fr-FR')} XPF bonus)` : ''), total, 'credit', data.balance));
      _save(data);
      return { credited: total, bonus };
    },

    /* Crédite sans bonus (remboursement, ajustement) */
    creditRaw(amount, label) {
      const data = _load();
      data.balance += amount;
      data.history.unshift(_entry(label, amount, 'credit', data.balance));
      _save(data);
    },

    /* Débite le Pass. Retourne false si solde insuffisant */
    debit(amount, label = 'Paiement') {
      const data = _load();
      if (data.balance < amount) return false;
      data.balance -= amount;
      data.history.unshift(_entry(label, amount, 'debit', data.balance));
      _save(data);
      return true;
    },

    /* Vérifie si le solde couvre un montant */
    canPay(amount) {
      return _load().balance >= amount;
    },

    /* Suggestion passerelle V6 */
    getSuggestion() {
      const data = _load();
      const monthly = data.totalReloaded / Math.max(1, data.history.filter(h => h.type === 'credit').length);
      if (monthly >= 3500) return `Vous rechargez en moyenne ${Math.round(monthly).toLocaleString('fr-FR')} XPF/mois — l'abonnement Pro à 3 500 XPF/mois vous ferait économiser !`;
      if (monthly >= 1800) return `Vous utilisez régulièrement le Pass HCS — découvrez nos abonnements dès 1 800 XPF/mois.`;
      return null;
    },

    /* Reset complet (pour tests) */
    reset() {
      localStorage.removeItem(KEY);
    }
  };

  global.HCSPass = HCSPass;

  console.log(`[HCS Pass] ✓ Chargé — Solde : ${HCSPass.getBalance().toLocaleString('fr-FR')} XPF`);

})(window);
