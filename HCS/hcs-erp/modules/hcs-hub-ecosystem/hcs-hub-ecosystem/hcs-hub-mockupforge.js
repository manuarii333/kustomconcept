/* ═══════════════════════════════════════════════════════════════
   HCS HUB — Connecteur MockupForge v12
   ═══════════════════════════════════════════════════════════════
   Inclure APRÈS hcs-hub.js et APRÈS le script de MockupForge :
     <script src="hcs-hub.js"></script>
     <script src="hcs-hub-mockupforge.js"></script>

   Ce patch :
   1. Ajoute syncHubBank() — importe hub.logos dans la banque MockupForge
   2. Ajoute writeToHub() — écrit les mockups exportés dans hub.mockups
   3. Ajoute un bouton "Sync Hub" à côté du bouton "Sync PicWish" existant
   4. Écoute les changements du hub pour auto-sync
   5. Ne casse PAS le syncPicWishBank() existant
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  if (typeof HCSHub === 'undefined') {
    console.warn('[HCS Hub MockupForge] hcs-hub.js non chargé — connecteur désactivé');
    return;
  }

  /* ═══════════════════════════════════════════════════════════
     LECTURE — Importer hub.logos dans la banque MockupForge
     ═══════════════════════════════════════════════════════════ */
  window.syncHubBank = async function() {
    try {
      const entries = await HCSHub.getAll('logos');
      if (!entries.length) {
        if (typeof toast === 'function') toast('⚠ Aucun logo dans le Hub');
        return 0;
      }

      let added = 0;

      entries.forEach(entry => {
        if (!entry.data) return; // pas d'image

        /* Déterminer la catégorie dans la banque */
        let cat = 'Hub — Logos';
        if (entry.source === 'picwish')     cat = 'Hub — Clients';
        if (entry.source === 'dtf-studio')  cat = 'Hub — Originaux';
        if (entry.type === 'original')      cat = 'Hub — Originaux';

        /* Construire le nom affiché */
        const nom = entry.client
          ? `${entry.client} — ${entry.name}`
          : entry.name || entry.id;

        /* Vérifier la banque si elle existe */
        if (typeof state !== 'undefined' && state.imageBank) {
          if (!state.imageBank[cat]) state.imageBank[cat] = [];
          const exists = state.imageBank[cat].some(i => i.id === entry.id);
          if (!exists) {
            state.imageBank[cat].push({
              id:   entry.id,
              name: nom,
              src:  entry.data,
              date: entry.meta?.date || entry.updatedAt?.slice(0, 10) || ''
            });
            added++;
          }
        }
      });

      if (added > 0) {
        if (typeof save === 'function') save();
        if (typeof updateTotals === 'function') updateTotals();
        if (typeof renderBankSidebar === 'function') renderBankSidebar();
        if (typeof renderBankGrid === 'function') renderBankGrid();
        if (typeof renderMobBankTabs === 'function') renderMobBankTabs();
        if (typeof toast === 'function') toast(`✓ ${added} image${added > 1 ? 's' : ''} importée${added > 1 ? 's' : ''} depuis le Hub`);
      } else {
        if (typeof toast === 'function') toast('✓ Hub déjà synchronisé');
      }

      console.log(`[HCS Hub MockupForge] Sync logos: ${added} ajoutée(s), ${entries.length} dans le hub`);
      return added;

    } catch(e) {
      console.warn('[HCS Hub MockupForge] Erreur sync:', e.message);
      if (typeof toast === 'function') toast('Erreur sync Hub : ' + e.message);
      return 0;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     ÉCRITURE — Exporter mockup fini dans hub.mockups
     ═══════════════════════════════════════════════════════════ */
  window.writeHubMockup = async function(pngDataUrl, metadata) {
    try {
      const clientName = (typeof state !== 'undefined' && state.clientName) || '';
      const record = await HCSHub.put('mockups', {
        type:   'mockup',
        source: 'mockup-forge',
        name:   metadata?.name || `mockup_${Date.now()}`,
        client: metadata?.client || clientName,
        data:   pngDataUrl,
        tags:   metadata?.tags || ['mockup', 'forge'],
        meta: {
          product:    metadata?.product || '',
          view:       metadata?.view || 'face',
          collection: metadata?.collection || '',
          exportSize: metadata?.exportSize || 1200,
          date:       new Date().toLocaleDateString('fr-FR')
        }
      });
      console.log(`[HCS Hub MockupForge] ✓ Mockup écrit: ${record.id}`);
      return record;
    } catch(e) {
      console.warn('[HCS Hub MockupForge] Erreur écriture mockup:', e.message);
      return null;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     HOOK — Intercepter l'export pour auto-write dans le hub
     ═══════════════════════════════════════════════════════════ */
  const _originalOpenPreview = window.openPreview;

  if (typeof _originalOpenPreview === 'function') {
    window.openPreview = async function() {
      await _originalOpenPreview.apply(this, arguments);

      /* Après le preview, écrire aussi dans le hub */
      try {
        const canvas = await buildExportCanvas();
        const dataUrl = canvas.toDataURL('image/png', 0.92);
        const clientName = (typeof state !== 'undefined' && state.clientName) || 'client';

        await writeHubMockup(dataUrl, {
          name:    `${clientName}_mockup`,
          client:  clientName,
          product: (typeof state !== 'undefined' && state.activeProduct) || '',
          tags:    ['mockup', 'forge', 'auto-export']
        });

        if (typeof toast === 'function') toast('Hub ✓ Mockup synchronisé');
      } catch(e) {
        console.warn('[HCS Hub MockupForge] Auto-write mockup:', e.message);
      }
    };
  }

  /* ═══════════════════════════════════════════════════════════
     UI — Ajouter le bouton "Sync Hub" dans l'interface
     ═══════════════════════════════════════════════════════════ */
  function injectHubButton() {
    /* Chercher le bouton PicWish existant pour placer le hub à côté */
    const btns = document.querySelectorAll('button');
    let picwishBtn = null;
    btns.forEach(b => {
      if (b.textContent.includes('PicWish') || b.onclick?.toString().includes('syncPicWish')) {
        picwishBtn = b;
      }
    });

    if (picwishBtn && !document.getElementById('hub-sync-btn')) {
      const hubBtn = document.createElement('button');
      hubBtn.id = 'hub-sync-btn';
      hubBtn.textContent = '🔄 Sync Hub';
      hubBtn.title = 'Importer les logos depuis le HCS Hub (PicWish + DTF Studio + autres apps)';
      /* Copier le style du bouton PicWish */
      hubBtn.className = picwishBtn.className;
      hubBtn.style.cssText = picwishBtn.style.cssText;
      hubBtn.style.borderColor = '#a18cd1';
      hubBtn.style.color = '#a18cd1';
      hubBtn.onclick = function() { syncHubBank(); };
      picwishBtn.parentNode.insertBefore(hubBtn, picwishBtn.nextSibling);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     AUTO-SYNC — Écouter les changements du hub
     ═══════════════════════════════════════════════════════════ */
  let _autoSyncTimeout = null;
  HCSHub.onChange('logos', function() {
    /* Debounce — ne pas sync à chaque micro-changement */
    clearTimeout(_autoSyncTimeout);
    _autoSyncTimeout = setTimeout(function() {
      console.log('[HCS Hub MockupForge] Changement détecté dans hub.logos — auto-sync');
      syncHubBank();
    }, 2000);
  });

  /* ═══════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════ */
  /* Migration au chargement */
  HCSHub.migrateFromPicWish().then(n => {
    if (n > 0) console.log(`[HCS Hub MockupForge] ${n} entrée(s) migrée(s) depuis PicWish legacy`);
  });

  /* Injecter le bouton quand le DOM est prêt */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(injectHubButton, 500);
    });
  } else {
    setTimeout(injectHubButton, 500);
  }

  console.log('[HCS Hub MockupForge] ✓ Connecteur actif — lecture hub.logos + écriture hub.mockups');
})();
