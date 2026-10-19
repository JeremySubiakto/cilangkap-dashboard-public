/* ==========================================================================
 * gate-preview.js — bootstrap for gate-preview.html ONLY (not loaded by
 * index.html). Mounts the password gate and, on unlock, renders a stand-in
 * panel listing the decrypted payload keys. It also demonstrates the
 * in-app "Simpan terenkripsi" re-save with MCD.vault.encryptWithKey.
 *
 * URL parameters (non-secret, for testing):
 *   ?idle=0.5  idle auto-lock after 0,5 minute (default 15)
 *   ?map=0     preview the offline background (the line plan, no satellite)
 * The theme follows the system setting (Terang / Gelap), like the sign-in.
 * On-screen text is Indonesian (COPY_STYLE_EN items 19 and 24).
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  MCD.config = MCD.config || {};
  MCD.config.gate = MCD.config.gate || {};
  var idle = Number(params.get('idle'));
  if (idle > 0) MCD.config.gate.idleMinutes = idle;
  if (params.get('map') === '0') MCD.config.gate.map = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function describe(value) {
    if (Array.isArray(value)) return value.length.toLocaleString('id-ID') + ' baris';
    if (value && typeof value === 'object') return Object.keys(value).length.toLocaleString('id-ID') + ' kolom';
    return typeof value;
  }

  function minutesLabel(m) {
    return String(m).replace('.', ',') + ' menit';
  }

  // Same theme rule as the sign-in (gate.js): <html data-theme> when set, else the system.
  function previewTheme() {
    var set = document.documentElement.getAttribute('data-theme');
    if (set === 'day' || set === 'night') return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night';
  }

  function renderShell(session) {
    // Keep the key in this closure only (never on window, never in storage).
    var key = session.key, salt = session.salt, iter = session.iter;
    var payload = session.payload || {};
    var app = document.getElementById('app');
    document.documentElement.setAttribute('data-theme', previewTheme());

    var panel = el('section', 'pv-panel');
    panel.setAttribute('aria-labelledby', 'pv-title');
    panel.appendChild(el('p', 'pv-eyebrow', 'Bank Mandiri · KCP Jakarta Cilangkap'));
    var title = el('h1', 'pv-title', 'Data berhasil dibuka');
    title.id = 'pv-title';
    title.tabIndex = -1;
    panel.appendChild(title);
    panel.appendChild(el('p', 'pv-lede',
      'Ini pratinjau halaman masuk. Data dibuka di perangkat ini. Di dashboard lengkap, aplikasi dimulai pada titik ini.'));

    var meta = el('dl', 'pv-meta');
    [
      ['Format data', String(payload.format || '—') + ' v' + String(payload.v || '—')],
      ['Dibuat', String(payload.created || '—')],
      ['Catatan', String(payload.note || '—')],
      ['Enkripsi', 'AES-256-GCM · PBKDF2-SHA-256 · ' + iter.toLocaleString('id-ID') + ' iterasi'],
      ['Kunci data', key.algorithm.name + ' ' + key.algorithm.length + '-bit · tidak dapat diekspor']
    ].forEach(function (row) {
      meta.appendChild(el('dt', null, row[0]));
      meta.appendChild(el('dd', null, row[1]));
    });
    panel.appendChild(meta);

    panel.appendChild(el('h2', 'pv-h', 'Isi data'));
    var keys = el('ul', 'pv-chips');
    Object.keys(payload).forEach(function (k) { keys.appendChild(el('li', null, k)); });
    panel.appendChild(keys);

    panel.appendChild(el('h2', 'pv-h', 'Jenis data di salinan terenkripsi'));
    var ds = payload.datasets && typeof payload.datasets === 'object' ? payload.datasets : {};
    var names = Object.keys(ds);
    if (names.length) {
      var list = el('ul', 'pv-chips');
      names.forEach(function (n) { list.appendChild(el('li', null, n + ' · ' + describe(ds[n]))); });
      panel.appendChild(list);
    } else {
      panel.appendChild(el('p', 'pv-empty', 'Salinan terenkripsi ini belum berisi data bank. Dashboard menggunakan data publik dan data contoh.'));
    }

    var actions = el('div', 'pv-actions');
    var lockBtn = el('button', 'pv-btn pv-btn--primary', 'Kunci');
    lockBtn.type = 'button';
    lockBtn.addEventListener('click', function () { MCD.gate.lock(); });
    var saveBtn = el('button', 'pv-btn', 'Simpan salinan terenkripsi');
    saveBtn.type = 'button';
    var note = el('p', 'pv-note');
    note.setAttribute('role', 'status');
    saveBtn.addEventListener('click', function () {
      saveBtn.disabled = true;
      var next = Object.assign({}, payload, { saved: new Date().toISOString() });
      MCD.vault.encryptWithKey(next, key, salt, iter)
        .then(function (vault) {
          // Verify before offering the file.
          return MCD.vault.decryptWithKey(vault, key).then(function () { return vault; });
        })
        .then(function (vault) {
          MCD.gate.downloadVault(vault, 'vault.js');
          note.textContent = 'Salinan terenkripsi telah diunduh (vault.js). Pasang di folder data agar terbuka saat masuk berikutnya.';
        }, function () {
          note.textContent = 'Salinan terenkripsi gagal disimpan. Coba lagi.';
        })
        .then(function () { saveBtn.disabled = false; });
    });
    actions.appendChild(lockBtn);
    actions.appendChild(saveBtn);
    panel.appendChild(actions);
    panel.appendChild(note);
    panel.appendChild(el('p', 'pv-note', 'Dashboard dikunci otomatis setelah ' + minutesLabel(MCD.config.gate.idleMinutes || 15) + ' tanpa aktivitas.'));

    app.appendChild(panel);
    title.focus();
  }

  MCD.gate.mount({ vault: window.MCD_VAULT, onUnlock: renderShell });
})(window.MCD = window.MCD || {});
