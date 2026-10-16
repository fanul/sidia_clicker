/**
 * SIDIA AI Automation Dashboard Controller
 * Seamlessly integrates DecisionGrid with backend telemetry and execution triggers.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let decisionGrid = null;
  let localTimerStart = null;

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Parse telemetry directly from logs as fallback/enrichment
  function parseClientTelemetry(logs, startedAtStr) {
    let currentMenu = 'Naskah Masuk';
    let totalTarget = 0;
    let currentDocIndex = 0;
    let currentStep = 'Memproses Naskah';
    let currentStepKey = 'opening_doc';
    let actionDetail = 'Membaca antrean dokumen...';
    let skippedCount = 0;
    let docPerihal = '';
    let docSender = '';

    for (let i = (logs || []).length - 1; i >= 0; i--) {
      const line = logs[i];
      if (!docPerihal) {
        const p = line.match(/(?:Perihal|Tentang|Subject|Dokumen)\s*:\s*([^\n\r]+)/i);
        if (p) docPerihal = p[1].trim();
      }
      if (!totalTarget) {
        const m = line.match(/Submenu clicked:\s*([A-Za-z\s]+)\s*(\d+)/i) || line.match(/Processing menu:\s*([A-Za-z\s]+)\s*(\d+)/i);
        if (m) { currentMenu = m[1].trim(); totalTarget = parseInt(m[2], 10); }
      }
      if (!currentDocIndex) {
        const d = line.match(/Processing document\s*(\d+)/i) || line.match(/Preparing to process document\s*(\d+)/i);
        if (d) { currentDocIndex = parseInt(d[1], 10); }
      }
      if (line.includes('Melewati dokumen baris')) {
        skippedCount++;
      }
      if (actionDetail === 'Membaca antrean dokumen...') {
        if (line.includes('Melewati dokumen') || line.includes('melewati ke dokumen')) {
          currentStep = 'Melewati Dokumen';
          currentStepKey = 'skipping';
          actionDetail = 'Dokumen tanpa form dilewati ke baris berikutnya';
        } else if (line.includes('Rating') || line.includes('bintang') || line.includes('star')) {
          currentStep = 'Memberi Rating Bintang 5';
          currentStepKey = 'rating';
          actionDetail = 'Memilih rating bintang 5';
        } else if (line.includes('Simpan button clicked') || line.includes('OK button clicked') || line.includes('Dialog konfirmasi')) {
          currentStep = 'Menyimpan Umpan Balik';
          currentStepKey = 'saving';
          actionDetail = 'Konfirmasi dialog simpan feedback';
        } else if (line.includes('Filling textarea') || line.includes('Textarea found') || line.includes('type method')) {
          currentStep = 'Mengetik Feedback';
          currentStepKey = 'typing';
          actionDetail = 'Input pesan disposisi ke textarea';
        } else if (line.includes('Feedback button found') || line.includes('Clicking Feedback button')) {
          currentStep = 'Membuka Form Feedback';
          currentStepKey = 'feedback_modal';
          actionDetail = 'Klik tombol feedback & menunggu modal';
        } else if (line.includes('Lihat button clicked') || line.includes('Waiting for page navigation after Lihat')) {
          currentStep = 'Membuka Detail Naskah';
          currentStepKey = 'opening_doc';
          actionDetail = 'Membuka lembar detail naskah masuk';
        } else if (line.includes('Starting Lihat button search') || line.includes('Lihat search:')) {
          currentStep = 'Memindai Tombol Naskah';
          currentStepKey = 'scanning';
          actionDetail = 'Mencari tombol naskah yang siap diproses';
        } else if (line.includes('Disposisi tab')) {
          currentStep = 'Memilih Tab Disposisi';
          currentStepKey = 'tab_selection';
          actionDetail = 'Navigasi tabel disposisi';
        } else if (line.includes('Submenu clicked') || line.includes('Naskah Masuk')) {
          currentStep = 'Navigasi Menu';
          currentStepKey = 'navigating';
          actionDetail = 'Memilih submenu dokumen';
        }
      }
    }

    const percent = totalTarget > 0 ? Math.min(100, Math.round((currentDocIndex / totalTarget) * 100)) : 0;
    const remaining = totalTarget > 0 ? Math.max(0, totalTarget - currentDocIndex) : 0;
    const startTime = startedAtStr ? new Date(startedAtStr).getTime() : Date.now();
    const elapsedSec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const avgSecPerDoc = currentDocIndex > 0 ? Math.round(elapsedSec / currentDocIndex) : 18;
    const etaSec = remaining * avgSecPerDoc;

    return {
      currentMenu,
      totalTarget,
      currentDocIndex,
      remaining,
      currentStep,
      currentStepKey,
      actionDetail,
      percent,
      elapsedSec,
      avgSecPerDoc,
      etaSec,
      skippedCount,
      docPerihal
    };
  }

  async function apiPost(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    });
    return res.json();
  }

  async function pollStatus() {
    try {
      const resStatus = await fetch('/api/status').then(r => r.json());
      const isRunning = !!resStatus.running;

      // Update Header Badges & Action Buttons
      const stateBadge = $('state-badge');
      const stateText = $('state-text');
      const btnRun = $('btn-run');
      const btnStop = $('btn-stop');

      if (isRunning) {
        if (stateBadge) stateBadge.className = 'status-badge running';
        if (stateText) stateText.textContent = 'Sedang Berjalan';
        if (btnRun) btnRun.disabled = true;
        if (btnStop) btnStop.disabled = false;
        if (!localTimerStart) {
          localTimerStart = resStatus.startedAt ? new Date(resStatus.startedAt).getTime() : Date.now();
        }
      } else {
        if (stateBadge) stateBadge.className = 'status-badge';
        if (stateText) stateText.textContent = 'Sistem Idle';
        if (btnRun) btnRun.disabled = false;
        if (btnStop) btnStop.disabled = true;
        localTimerStart = null;
      }

      // Synchronize Decision Grid with live telemetry
      const lastLogs = resStatus.logs || [];
      const telem = resStatus.telemetry || parseClientTelemetry(lastLogs, resStatus.startedAt);

      if (decisionGrid) {
        decisionGrid.syncState(isRunning, telem);
      }

      // Stream logs into Expandable Terminal Log Drawer
      const logBody = $('log-drawer-content');
      if (logBody && lastLogs.length > 0) {
        logBody.textContent = lastLogs.join('\n');
        logBody.scrollTop = logBody.scrollHeight;
      }

    } catch (err) {
      const stateText = $('state-text');
      const stateBadge = $('state-badge');
      if (stateText) stateText.textContent = 'Server Offline';
      if (stateBadge) stateBadge.className = 'status-badge';
    }
  }

  // Load and save settings
  async function loadSettings() {
    try {
      const cfg = await fetch('/api/settings').then(r => r.json());
      if ($('cfg-user')) $('cfg-user').value = cfg.SIDIA_USERNAME || '';
      if ($('cfg-pass')) $('cfg-pass').value = '';
      if ($('cfg-feedback')) $('cfg-feedback').value = cfg.FEEDBACK_MESSAGE || '';
      if ($('cfg-types')) $('cfg-types').value = cfg.DOCUMENT_TYPES || '';
      if ($('cfg-skip')) $('cfg-skip').value = cfg.SKIP_SUBMENUS || '';
    } catch (e) {}
  }

  function initListeners() {
    // Run button
    const btnRun = $('btn-run');
    if (btnRun) {
      btnRun.onclick = async () => {
        const headless = $('headless') ? $('headless').checked : true;
        await apiPost('/api/run', { headless });
        pollStatus();
      };
    }

    // Stop button
    const btnStop = $('btn-stop');
    if (btnStop) {
      btnStop.onclick = async () => {
        if (confirm('Apakah Anda yakin ingin menghentikan otomasi yang sedang berjalan?')) {
          await apiPost('/api/stop');
          pollStatus();
        }
      };
    }

    // Mimic Auth button (Port 9222)
    const btnMimic = $('btn-mimic');
    if (btnMimic) {
      btnMimic.onclick = async () => {
        btnMimic.disabled = true;
        const originalText = btnMimic.innerHTML;
        btnMimic.innerHTML = '<span>⏳</span> Membuka Chrome...';
        try {
          const res = await apiPost('/api/mimic-auth');
          alert(res.message || 'Jendela Google Chrome resmi (Port 9222) telah dibuka. Silakan login di jendela tersebut!');
        } catch (err) {
          alert('Gagal membuka Chrome Port 9222: ' + err.message);
        } finally {
          btnMimic.disabled = false;
          btnMimic.innerHTML = originalText;
          pollStatus();
        }
      };
    }

    // Settings form submit
    const formSettings = $('form-settings');
    if (formSettings) {
      formSettings.onsubmit = async (e) => {
        e.preventDefault();
        const msgEl = $('cfg-save-msg');
        if (msgEl) {
          msgEl.textContent = 'Menyimpan...';
          msgEl.style.color = '#3b82f6';
        }

        try {
          const payload = {
            SIDIA_USERNAME: $('cfg-user') ? $('cfg-user').value : '',
            SIDIA_PASSWORD: $('cfg-pass') ? $('cfg-pass').value : '',
            FEEDBACK_MESSAGE: $('cfg-feedback') ? $('cfg-feedback').value : '',
            DOCUMENT_TYPES: $('cfg-types') ? $('cfg-types').value : '',
            SKIP_SUBMENUS: $('cfg-skip') ? $('cfg-skip').value : ''
          };
          const res = await apiPost('/api/settings', payload);
          if (!res.ok) throw new Error(res.message || 'Gagal menyimpan');
          if (msgEl) {
            msgEl.style.color = '#10b981';
            msgEl.textContent = 'Pengaturan berhasil disimpan!';
            setTimeout(() => { msgEl.textContent = ''; }, 4000);
          }
          if ($('cfg-pass')) $('cfg-pass').value = '';
        } catch (err) {
          if (msgEl) {
            msgEl.style.color = '#ef4444';
            msgEl.textContent = err.message;
          }
        }
      };
    }

    // Session Injection: Copy Snippet button
    const btnCopySnippet = $('btn-copy-snippet');
    if (btnCopySnippet) {
      btnCopySnippet.onclick = () => {
        const snippet = "(() => { const p = { ...localStorage, ...sessionStorage, cookies: document.cookie.split('; ').filter(c=>!/^(_ga|_gid|_gat|_gcl|_fbp|_utm|amp|nid|consent)/i.test(c)).join('; ') }; copy(JSON.stringify(p)); return '✅ BERHASIL DISALIN (' + Object.keys(p).length + ' data)! Tempel (Ctrl+V) di kotak dashboard.'; })()";
        navigator.clipboard.writeText(snippet).then(() => {
          btnCopySnippet.textContent = '✓ Tersalin!';
          setTimeout(() => { btnCopySnippet.textContent = '📋 Salin Perintah'; }, 2000);
        });
      };
    }

    // Expandable Terminal Log Drawer Toggle
    const stLogTrigger = $('st-log-trigger');
    const logDrawer = $('log-drawer');
    const btnCloseLog = $('btn-close-log');
    const btnClearLog = $('btn-clear-log');

    if (stLogTrigger && logDrawer) {
      stLogTrigger.onclick = (e) => {
        e.stopPropagation();
        logDrawer.classList.toggle('open');
      };
    }
    if (btnCloseLog && logDrawer) {
      btnCloseLog.onclick = (e) => {
        e.stopPropagation();
        logDrawer.classList.remove('open');
      };
    }
    if (btnClearLog) {
      btnClearLog.onclick = (e) => {
        e.stopPropagation();
        const content = $('log-drawer-content');
        if (content) content.textContent = 'Log dibersihkan.';
      };
    }
    const btnCopyLog = $('btn-copy-log');
    if (btnCopyLog) {
      btnCopyLog.onclick = (e) => {
        e.stopPropagation();
        const content = $('log-drawer-content');
        if (content && content.textContent) {
          navigator.clipboard.writeText(content.textContent).then(() => {
            btnCopyLog.textContent = '✓ Tersalin!';
            setTimeout(() => { btnCopyLog.textContent = '📋 Salin Log'; }, 2000);
          });
        }
      };
    }

    // Session Injection: Inject button
    const btnInject = $('btn-inject-session');
    if (btnInject) {
      btnInject.onclick = async () => {
        const payloadText = $('session-payload').value.trim();
        const feedbackEl = $('session-feedback');
        if (!payloadText) {
          if (feedbackEl) {
            feedbackEl.textContent = 'Mohon tempel data sesi terlebih dahulu!';
            feedbackEl.style.color = '#ef4444';
          }
          return;
        }

        btnInject.disabled = true;
        btnInject.textContent = 'Menyuntikkan...';

        try {
          const res = await apiPost('/api/session', { session: payloadText });
          if (!res.ok) throw new Error(res.message || 'Gagal menyimpan');
          if (feedbackEl) {
            if (res.status && !res.status.hasAuthToken) {
              feedbackEl.textContent = '⚠️ ' + res.message + ' — PERHATIAN: authToken belum terdeteksi! Gunakan perintah console agar token ikut tersalin.';
              feedbackEl.style.color = '#f59e0b';
            } else {
              feedbackEl.textContent = '🎉 ' + (res.message || 'Sesi login berhasil disuntikkan!');
              feedbackEl.style.color = '#10b981';
            }
          }
          $('session-payload').value = '';
          checkSessionStatus();
          setTimeout(() => { if (feedbackEl) feedbackEl.textContent = ''; }, 8000);
        } catch (err) {
          if (feedbackEl) {
            feedbackEl.textContent = 'Gagal: ' + err.message;
            feedbackEl.style.color = '#ef4444';
          }
        } finally {
          btnInject.disabled = false;
          btnInject.textContent = '💉 Suntikkan Sesi';
        }
      };
    }

    // Session Injection: Clear button
    const btnClearSession = $('btn-clear-session');
    if (btnClearSession) {
      btnClearSession.onclick = async () => {
        if (confirm('Hapus data sesi login yang tersimpan?')) {
          await fetch('/api/session', { method: 'DELETE' });
          const feedbackEl = $('session-feedback');
          if (feedbackEl) {
            feedbackEl.textContent = 'Sesi tersimpan telah dihapus.';
            feedbackEl.style.color = '#94a3b8';
            setTimeout(() => { feedbackEl.textContent = ''; }, 3000);
          }
          checkSessionStatus();
        }
      };
    }
  }

  async function checkSessionStatus() {
    try {
      const res = await fetch('/api/session').then(r => r.json());
      const badge = $('session-status-badge');
      if (!badge) return;
      if (res.exists) {
        if (res.hasAuthToken) {
          badge.className = 'session-status-badge active';
          badge.style.background = '';
          badge.style.color = '';
          badge.style.borderColor = '';
          badge.textContent = '✓ Sesi Lengkap (Token + Cookie Siap)';
        } else {
          badge.className = 'session-status-badge';
          badge.style.background = 'rgba(245, 158, 11, 0.18)';
          badge.style.color = '#fbbf24';
          badge.style.borderColor = 'rgba(245, 158, 11, 0.45)';
          badge.textContent = '⚠️ Hanya Cookie (Token Belum Ada!)';
        }
      } else {
        badge.className = 'session-status-badge';
        badge.style.background = '';
        badge.style.color = '';
        badge.style.borderColor = '';
        badge.textContent = 'Belum ada sesi tersimpan';
      }
    } catch (e) {}
  }

  // Initialize once DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    decisionGrid = new DecisionGrid('stage');
    initListeners();
    loadSettings();
    checkSessionStatus();
    pollStatus();

    // Responsive dynamic polling: 500ms saat berjalan (beat sinkron instan), 2000ms saat idle
    let pollInterval = 1000;
    let pollTimer = null;
    const scheduleNextPoll = () => {
      const stateBadge = $('state-badge');
      const isRunning = stateBadge && stateBadge.classList.contains('running');
      pollInterval = isRunning ? 500 : 2000;
      pollTimer = setTimeout(async () => {
        await pollStatus();
        scheduleNextPoll();
      }, pollInterval);
    };
    scheduleNextPoll();
  });
})();
