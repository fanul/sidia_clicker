/**
 * DecisionGrid Engine for SIDIA Automation
 * Exact visual fidelity, shaders, light pillars, and 2.5D camera from Animation/body-animation.html
 * Enhanced with synchronized real-time automation progress, authentic SIDIA telemetry, and smooth lerped camera navigation.
 */
(() => {
  'use strict';

  class DecisionGrid {
    constructor(stageId = 'stage') {
      this.stage = document.getElementById(stageId);
      if (!this.stage) return;

      this.world = document.getElementById('world');
      this.bgc = document.getElementById('bg');
      this.fgc = document.getElementById('fg');
      this.bx = this.bgc.getContext('2d');
      this.fx = this.fgc.getContext('2d');

      this.badgeEl = document.getElementById('badge');
      this.titleEl = document.getElementById('title');
      this.subEl = document.getElementById('sub');
      this.ruleEl = document.getElementById('rule');
      this.pillsEl = document.getElementById('pills');
      this.flashEl = document.getElementById('flash');
      this.btnFs = document.getElementById('btn-fs');

      // Stage telemetry elements
      this.stMenu = document.getElementById('st-menu');
      this.stDoc = document.getElementById('st-doc');
      this.stSpeed = document.getElementById('st-speed');
      this.stDetail = document.getElementById('st-detail');
      this.stPctVal = document.getElementById('st-pct-val');
      this.stBarFill = document.getElementById('st-bar-fill');

      this.initMath();
      this.initWorld();
      this.initNetwork();
      this.initPillars();
      this.initCases();
      this.initListeners();

      this.W = 0;
      this.H = 0;
      this.dpr = 1;
      this.S = 1;
      this.fit = 1;

      // Camera coordinates & trajectory state
      this.cam = { x: this.WW / 2, y: this.WH / 2, z: 1.08, r: 0 };
      this.camTarget = { x: this.WW / 2, y: this.WH / 2, z: 1.08, r: 0 };
      this.camTraj = null; // Active smooth keyframed spline trajectory

      this.ci = 0;
      this.cs = this.CASES[0];
      this.time = 0;
      this.lastStageKey = '';
      this.lastDocIndex = 0;
      this.isRunning = false;
      this.paused = false;

      this.hotCards = [];
      this.subSegs = [];
      this.run = { paths: [], branches: [], rings: [], hotAt: [-1, -1, -1] };

      this.resize();
      new ResizeObserver(() => this.resize()).observe(this.stage);

      this.activateStage(0, false);
      this.lastFrame = performance.now();
      requestAnimationFrame(t => this.frame(t));
    }

    initMath() {
      const rng = seed => {
        return () => {
          seed |= 0; seed = seed + 0x6D2B79F5 | 0;
          let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
          t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
      };
      this.R = rng(19);
      this.rr = (a, b) => a + (b - a) * this.R();
      this.pick = a => a[Math.floor(this.R() * a.length)];
      this.clamp01 = v => Math.max(0, Math.min(1, v));
      this.ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    }

    initWorld() {
      this.COLS = 5;
      this.ROWS = 8;
      this.CW = 300;
      this.CH = 150;
      this.PX = 440;
      this.PY = 190;
      this.X0 = 170;
      this.Y0 = 250;
      this.WW = this.X0 * 2 + this.PX * (this.COLS - 1) + this.CW;
      this.WH = this.Y0 + this.PY * (this.ROWS - 1) + this.CH + 160;

      this.world.style.width = this.WW + 'px';
      this.world.style.height = this.WH + 'px';

      // Authentic SIDIA Columns
      const COLHEAD = [
        '01 SESI & KREDENSIAL',
        '02 INBOX & AGENDA',
        '03 KOGNITIF & PARSER',
        '04 FORM & FEEDBACK AI',
        '05 RATING & COMMIT DB'
      ];

      // Authentic SIDIA Nodes / System Operations
      const SIDIA_NAMES = [
        // Col 0: Sesi & Otentikasi
        ['auth_stealth_v3', 'token_recaptcha', 'sidia_session', 'npp_authenticator', 'cookie_vault', 'bypass_bot_score', 'profile_lockfile', 'sso_bridge'],
        // Col 1: Inbox & Agenda
        ['inbox_crawler', 'agenda_index', 'surat_masuk', 'filter_naskah', 'unread_badge', 'tabel_disposisi', 'batch_queue', 'kategori_route'],
        // Col 2: Kognitif & Parser
        ['dom_inspector', 'tombol_lihat', 'perihal_parser', 'lembar_naskah', 'viewer_render', 'agenda_query', 'pengirim_ident', 'ocr_metadata'],
        // Col 3: Form & Feedback AI
        ['modal_trigger', 'catatan_disposisi', 'nlp_synthesize', 'textarea_writer', 'instruksi_pejabat', 'template_matcher', 'validasi_input', 'disposisi_ready'],
        // Col 4: Rating & Commit DB
        ['star_rating_5', 'dialog_confirm', 'commit_disposisi', 'http_200_ok', 'audit_logger', 'persisted_record', 'telemetry_sync', 'batch_complete']
      ];

      const SIDIA_TAGS = ['aktif', 'sync', 'antrean', 'tervalidasi', 'ready', 'siap'];

      const SIDIA_KV = [
        () => ['dok', this.pick(['NKH0002', 'NKH0001', 'NKH0016', 'Nota Dinas', 'Surat Masuk'])],
        () => ['lat', Math.round(65 + this.R() * 150) + 'ms'],
        () => ['status', this.pick(['diproses', 'tervalidasi', 'antrean', 'aktif', 'terkirim'])],
        () => ['agenda', 'AGD-' + Math.round(1000 + this.R() * 8999)],
        () => ['rating', '★★★★★ (5)'],
        () => ['token', 'v3-score ' + (0.9 + this.R() * 0.09).toFixed(2)],
        () => ['feedback', 'dipedomani'],
        () => ['akurasi', Math.round(96 + this.R() * 4) + '%'],
      ];

      this.cards = [];
      this.world.innerHTML = '';
      for (let c = 0; c < this.COLS; c++) {
        const h = document.createElement('div');
        h.className = 'colhead';
        h.textContent = COLHEAD[c];
        h.style.left = this.X0 + c * this.PX + 'px';
        h.style.top = this.Y0 - 90 + (c % 2) * 38 + 'px';
        this.world.appendChild(h);

        for (let r = 0; r < this.ROWS; r++) {
          const card = {
            c, r,
            x: this.X0 + c * this.PX + (this.R() - .5) * 12,
            y: this.Y0 + r * this.PY + (c % 2) * 38 + (this.R() - .5) * 10
          };
          card.name = SIDIA_NAMES[c][r % SIDIA_NAMES[c].length];
          card.tag = this.pick(SIDIA_TAGS);

          const el = document.createElement('div');
          el.className = 'card';
          el.style.left = card.x + 'px';
          el.style.top = card.y + 'px';

          const rows = [0, 1, 2].map(() => this.pick(SIDIA_KV)()).map(([k, v]) => `<div class="kv"><i>${k}</i><b>${v}</b></div>`).join('');
          el.innerHTML = `<h4><span class="name">${card.name}</span><span class="tag">${card.tag}</span></h4>${rows}` +
                         `<div class="bar"><u style="width:${Math.round(35 + this.R() * 60)}%"></u></div><div class="chip"></div>`;

          card.el = el;
          card.nameEl = el.querySelector('.name');
          card.tagEl = el.querySelector('.tag');
          card.chipEl = el.querySelector('.chip');
          this.world.appendChild(el);
          this.cards.push(card);
        }
      }

      this.cardAt = (c, r) => this.cards[c * this.ROWS + r];
      this.ctr = k => ({ x: k.x + this.CW / 2, y: k.y + this.CH / 2 });
    }

    initNetwork() {
      const mkLink = (a, b) => {
        let p0, p3, c1, c2;
        if (a.c === b.c) {
          const down = b.y > a.y;
          p0 = { x: a.x + this.CW * this.rr(.2, .8), y: down ? a.y + this.CH : a.y };
          p3 = { x: b.x + this.CW * this.rr(.2, .8), y: down ? b.y : b.y + this.CH };
          const k = (p3.y - p0.y) * .5;
          c1 = { x: p0.x + this.rr(-60, 60), y: p0.y + k };
          c2 = { x: p3.x + this.rr(-60, 60), y: p3.y - k };
        } else {
          const right = b.c > a.c;
          p0 = { x: right ? a.x + this.CW : a.x, y: a.y + this.CH * this.rr(.15, .85) };
          p3 = { x: right ? b.x : b.x + this.CW, y: b.y + this.CH * this.rr(.15, .85) };
          const k = Math.abs(p3.x - p0.x) * .5 * (right ? 1 : -1);
          c1 = { x: p0.x + k, y: p0.y + this.rr(-30, 30) };
          c2 = { x: p3.x - k, y: p3.y + this.rr(-30, 30) };
        }
        return { p0, c1, c2, p3 };
      };

      const nearCard = a => {
        for (let n = 0; n < 20; n++) {
          const c = Math.max(0, Math.min(this.COLS - 1, a.c + Math.round(this.rr(-2, 2))));
          const r = Math.max(0, Math.min(this.ROWS - 1, a.r + Math.round(this.rr(-3, 3))));
          const b = this.cardAt(c, r);
          if (b !== a) return b;
        }
        return this.cardAt(0, 0);
      };

      this.mkLink = mkLink;
      this.nearCard = nearCard;

      this.bez = (l, u) => {
        const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
        return {
          x: a * l.p0.x + b * l.c1.x + c * l.c2.x + d * l.p3.x,
          y: a * l.p0.y + b * l.c1.y + c * l.c2.y + d * l.p3.y
        };
      };

      this.BUCKETS = [
        { rgb: '200,215,255', a: .15, links: [] },
        { rgb: '150,120,255', a: .17, links: [] },
        { rgb: '255,120,200', a: .14, links: [] },
        { rgb: '255,170,90', a: .12, links: [] },
        { rgb: '110,220,255', a: .15, links: [] },
      ];
      this.allLinks = [];
      for (let i = 0; i < 300; i++) {
        const a = this.pick(this.cards), l = mkLink(a, nearCard(a));
        this.BUCKETS[i % this.BUCKETS.length].links.push(l);
        this.allLinks.push(l);
      }

      this.streaks = { rgb: '210,225,255', a: .1, links: [] };
      for (let i = 0; i < 46; i++) {
        const p0 = { x: this.rr(-500, this.WW + 500), y: this.rr(-300, this.WH + 300) };
        const ang = this.rr(-.6, .6) + (this.R() < .5 ? 0 : Math.PI);
        const len = this.rr(900, 2400);
        const dx = Math.cos(ang), dy = Math.sin(ang), bow = this.rr(-120, 120);
        const l = {
          p0,
          p3: { x: p0.x + dx * len, y: p0.y + dy * len },
          c1: { x: p0.x + dx * len * .33 - dy * bow, y: p0.y + dy * len * .33 + dx * bow },
          c2: { x: p0.x + dx * len * .66 + dy * bow, y: p0.y + dy * len * .66 - dx * bow }
        };
        this.streaks.links.push(l);
        this.allLinks.push(l);
      }

      this.pulses = Array.from({ length: 48 }, () => ({
        l: this.pick(this.allLinks),
        sp: this.rr(.08, .3),
        ph: this.R(),
        rgb: this.pick(['255,255,255', '160,220,255', '255,170,230', '255,200,120'])
      }));
    }

    initPillars() {
      const PCOL = [[255,255,255], [150,230,255], [255,150,230], [255,215,140], [185,165,255]];
      // Tempatkan light pillar secara estetik di celah antar kolom kartu (gap kolom: 500, 940, 1380, 1820)
      const pxs = [80, 490, 930, 1370, 1810, 2250];
      this.pillars = pxs.map((x, i) => ({
        x: x + this.rr(-14, 14),
        col: PCOL[i % PCOL.length],
        base: this.rr(.7, 1),
        sp: this.rr(.8, 1.6),
        ph0: this.rr(0, 6.28),
        strands: Array.from({ length: 9 }, () => ({
          off: this.rr(-15, 15),
          amp: this.rr(3, 11),
          fr: this.rr(.004, .012),
          ph: this.rr(0, 6.28),
          sp: this.rr(.5, 1.4),
          w: this.rr(.8, 2.2),
          a: this.rr(.35, .85),
          white: this.R() < .45
        })),
        packets: Array.from({ length: 3 }, () => ({
          sp: this.rr(.05, .13),
          dir: this.R() < .5 ? 1 : -1,
          ph: this.R()
        })),
      }));

      this.sparks = Array.from({ length: 240 }, () => {
        const near = this.R() < .55 ? this.pick(this.pillars).x + (this.R() + this.R() + this.R() - 1.5) * 90 : this.rr(-200, this.WW + 200);
        return {
          x: near,
          y: this.rr(-200, this.WH + 200),
          v: this.rr(6, 30),
          ph: this.rr(0, 6.28),
          sp: this.rr(1, 4),
          s: this.rr(.8, 2.3),
          white: this.R() < .6
        };
      });
    }

    initCases() {
      // 6 Stage SIDIA Lifecycle Cases (Spanning Left-to-Right columns 0 -> 4)
      this.CASES = [
        {
          key: 'auth',
          n: '01',
          title: 'SESI PROFIL & OTENTIKASI STEALTH',
          sub: 'Otentikasi · Sesi Chrome Port 9222 · Token reCAPTCHA v3',
          rgb: '77,163,255', // Cyan-Blue
          tab: 0,
          camTarget: { c: 1, r: 2, z: 2.1, rAngle: -0.6 },
          hot: [
            { c: 0, r: 1, name: 'auth_stealth_v3', chip: 'port 9222 aktif' },
            { c: 1, r: 2, name: 'inbox_crawler', chip: 'antrean siap' },
            { c: 2, r: 2, name: 'agenda_index', chip: 'tervalidasi ✓' }
          ],
          reveal: ['Profil automation dimuat', 'Bypass token valid', 'Cookie sesi tersimpan', 'Robot siap bekerja']
        },
        {
          key: 'navigating',
          n: '02',
          title: 'NAVIGASI INBOX & PENYARINGAN AGENDA',
          sub: 'Menu Sidebar · Membaca Badge Target · Menyiapkan Antrean',
          rgb: '255,210,63', // Amber-Gold
          tab: 1,
          camTarget: { c: 2, r: 3, z: 2.2, rAngle: 0.5 },
          hot: [
            { c: 1, r: 2, name: 'inbox_crawler', chip: 'pilih · Naskah Masuk' },
            { c: 2, r: 3, name: 'agenda_index', chip: 'memindai antrean...' },
            { c: 3, r: 2, name: 'tabel_disposisi', chip: 'grid siap diproses' }
          ],
          reveal: ['Kategori menu dipilih', 'Badge target dibaca', 'Tabel disposisi siap', 'Menuju dokumen pertama']
        },
        {
          key: 'opening_doc',
          n: '03',
          title: 'MEMBUKA LEMBAR DETAIL NASKAH',
          sub: 'DOM Inspector · Temukan Tombol Lihat · Render Detail Dokumen',
          rgb: '160,130,255', // Indigo-Violet
          tab: 2,
          camTarget: { c: 2, r: 2, z: 2.5, rAngle: -0.8 },
          hot: [
            { c: 1, r: 4, name: 'agenda_index', chip: 'antrean dok' },
            { c: 2, r: 2, name: 'tombol_lihat', chip: 'klik detail lembar' },
            { c: 3, r: 4, name: 'lembar_naskah', chip: 'halaman naskah siap' }
          ],
          reveal: ['Tombol lihat ditemukan', 'Klik aksi pembacaan', 'Navigasi ke lembar naskah', 'Data naskah dimuat']
        },
        {
          key: 'typing',
          n: '04',
          title: 'SINTESIS CATATAN DISPOSISI AI',
          sub: 'Buka Modal Form · Analisis Perihal · Input Teks Disposisi',
          rgb: '255,106,43', // Hot Neon Orange
          tab: 3,
          camTarget: { c: 3, r: 3, z: 2.65, rAngle: 0.6 },
          hot: [
            { c: 2, r: 2, name: 'lembar_naskah', chip: 'baca perihal' },
            { c: 3, r: 3, name: 'catatan_disposisi', chip: 'sintesis umpan balik' },
            { c: 4, r: 2, name: 'textarea_writer', chip: 'dipedomani & laksanakan' }
          ],
          reveal: ['Form disposisi terbuka', 'Ketik teks ke textarea', 'Verifikasi pesan feedback', 'Siap dinilai']
        },
        {
          key: 'saving',
          n: '05',
          title: 'PENILAIAN BINTANG 5 & SIMPAN DISPOSISI',
          sub: 'Pilih Rating 5 Bintang · Konfirmasi Dialog · Kirim ke Database',
          rgb: '255,63,208', // Neon Pink/Magenta
          tab: 4,
          camTarget: { c: 3, r: 5, z: 2.35, rAngle: -0.5 },
          hot: [
            { c: 2, r: 5, name: 'star_rating_5', chip: 'rating 5 bintang ★★★★★' },
            { c: 3, r: 5, name: 'dialog_confirm', chip: 'konfirmasi modal OK' },
            { c: 4, r: 4, name: 'commit_disposisi', chip: 'tersimpan di database ✓' }
          ],
          reveal: ['Rating 5 bintang terpilih', 'Dialog konfirmasi disetujui', 'Disposisi berhasil disimpan', 'Lanjut ke dokumen berikutnya']
        },
        {
          key: 'completed',
          n: '06',
          title: 'SELURUH TARGET BATCH SELESAI',
          sub: 'Audit Eksekusi Selesai · Sesi Aman · Robot Standby',
          rgb: '50,220,130', // Emerald Green
          tab: 5,
          camTarget: { c: 2, r: 3, z: 1.12, rAngle: 0 },
          hot: [
            { c: 0, r: 3, name: 'auth_stealth_v3', chip: 'sesi aman' },
            { c: 2, r: 4, name: 'audit_logger', chip: 'riwayat tersimpan ✓' },
            { c: 4, r: 5, name: 'batch_complete', chip: '100% target tuntas' }
          ],
          reveal: ['Seluruh antrean tuntas', 'Sinkronisasi riwayat', 'Sesi tetap terhubung', 'Siap menunggu run berikutnya']
        }
      ];

      this.TABS = ['SESI', 'INBOX', 'NASKAH', 'FEEDBACK', 'SIMPAN', 'SELESAI'];
      if (this.pillsEl) {
        this.pillsEl.innerHTML = this.TABS.map(t => `<span class="pill">${t}</span>`).join('');
        this.pillEls = [...this.pillsEl.children];
      }
    }

    initListeners() {
      // Toggle Fullscreen button listener
      if (this.btnFs) {
        this.btnFs.addEventListener('click', e => {
          e.stopPropagation();
          this.toggleFullscreen();
        });
      }

      const onFsChange = () => {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || this.stage.classList.contains('is-fullscreen'));
        if (this.btnFs) {
          this.btnFs.innerHTML = isFs ? '<span class="fs-icon">✕</span> Perkecil' : '<span class="fs-icon">⛶</span> Layar Penuh';
        }
      };
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);

      // Click stage to pause/resume background animation cycle
      this.stage.addEventListener('click', e => {
        if (e.target.closest('#btn-fs') || e.target.closest('#stage-telem') || e.target.closest('#log-drawer')) return;
        this.paused = !this.paused;
      });
    }

    toggleFullscreen() {
      const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      const isClassFs = this.stage.classList.contains('is-fullscreen');
      const isFs = isNativeFs || isClassFs;

      const updateBtn = active => {
        if (this.btnFs) {
          this.btnFs.innerHTML = active ? '<span class="fs-icon">✕</span> Perkecil' : '<span class="fs-icon">⛶</span> Layar Penuh';
        }
        setTimeout(() => this.resize(), 50);
      };

      if (!isFs) {
        this.stage.classList.add('is-fullscreen');
        updateBtn(true);
        if (this.stage.requestFullscreen) {
          this.stage.requestFullscreen().catch(() => {});
        } else if (this.stage.webkitRequestFullscreen) {
          this.stage.webkitRequestFullscreen();
        }
      } else {
        this.stage.classList.remove('is-fullscreen');
        updateBtn(false);
        if (isNativeFs && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (isNativeFs && document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }

    resize() {
      this.W = this.stage.clientWidth;
      this.H = this.stage.clientHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [this.bgc, this.fgc]) {
        c.width = Math.round(this.W * this.dpr);
        c.height = Math.round(this.H * this.dpr);
      }
      this.fit = Math.max(this.W / this.WW, this.H / this.WH);
    }

    renderSub() {
      if (!this.subEl) return;
      this.subEl.innerHTML = this.subSegs.map((s, i) =>
        i === this.subSegs.length - 1 && this.subSegs.length > 1 ? `<em>${s}</em>` : `<span>${s}</span>`
      ).join('<i> · </i>');
    }

    addRing(card) {
      const p = this.ctr(card);
      this.run.rings.push({ x: p.x, y: p.y, t0: this.time });
    }

    pathBetween(a, b) {
      const shift = (l, dy) => ({ p0: l.p0, p3: l.p3, c1: { x: l.c1.x, y: l.c1.y + dy }, c2: { x: l.c2.x, y: l.c2.y - dy * .6 } });
      const p0 = { x: a.x + this.CW, y: a.y + this.CH * .5 };
      const p3 = { x: b.x, y: b.y + this.CH * .5 };
      const dx = Math.max(140, Math.abs(p3.x - p0.x) * .5);
      const l = { p0, p3, c1: { x: p0.x + dx, y: p0.y }, c2: { x: p3.x - dx, y: p3.y } };
      return [l, shift(l, -34), shift(l, 28)];
    }

    /**
     * Typewriter animation for dynamic card elements (names, chips, or kv values)
     */
    typeText(el, text, speed = 25, isChip = false) {
      if (!el) return;
      if (el._typeTimer) clearInterval(el._typeTimer);
      if (isChip) el.classList.add('typing');
      let i = 0;
      el.textContent = '';
      el._typeTimer = setInterval(() => {
        if (i < text.length) {
          el.textContent = text.slice(0, i + 1);
          i++;
        } else {
          clearInterval(el._typeTimer);
          el._typeTimer = null;
          if (isChip) {
            setTimeout(() => el.classList.remove('typing'), 1000);
          }
        }
      }, speed);
    }

    /**
     * Activates a stage and focuses camera onto the active node cluster
     */
    activateStage(idx, isAuto = false, liveDetails = null) {
      this.ci = idx;
      this.cs = this.CASES[idx];

      // Reset previous hot cards
      for (const c of this.hotCards) {
        c.el.classList.remove('hot');
        if (c.chipEl && c.chipEl._typeTimer) clearInterval(c.chipEl._typeTimer);
        c.nameEl.textContent = c.name;
        c.tagEl.textContent = c.tag;
        c.chipEl.textContent = '';
        c.chipEl.classList.remove('typing');
      }

      const hotConfigs = (liveDetails && liveDetails.hot) || this.cs.hot;
      this.hotCards = hotConfigs.map((h, i) => {
        const c = this.cardAt(h.c, h.r);
        c.nameEl.textContent = h.name;
        c.tagEl.textContent = 'live';
        c.el.classList.add('hot');
        // Typewriter animation on the chip for a live robotic terminal feel
        this.typeText(c.chipEl, h.chip, 22, true);
        return c;
      });

      this.stage.style.setProperty('--acc-rgb', this.cs.rgb);
      if (this.badgeEl) {
        this.badgeEl.textContent = (liveDetails && liveDetails.badge) || `STAGE ${this.cs.n} / 06`;
      }
      if (this.titleEl) {
        this.titleEl.textContent = (liveDetails && liveDetails.title) || this.cs.title;
      }

      if (this.titleEl && this.ruleEl && this.flashEl) {
        this.titleEl.classList.remove('in');
        this.ruleEl.classList.remove('go');
        this.flashEl.classList.remove('go');
        void this.titleEl.offsetWidth;
        this.titleEl.classList.add('in');
        this.ruleEl.classList.add('go');
        this.flashEl.classList.add('go');
      }

      if (this.pillEls) {
        this.pillEls.forEach((p, k) => p.classList.toggle('on', k === this.cs.tab));
      }

      this.subSegs = (liveDetails && liveDetails.sub) ? [liveDetails.sub] : [this.cs.sub];
      if (this.cs.reveal) {
        this.subSegs.push(...this.cs.reveal.slice(0, 2));
      }
      this.renderSub();

      // Trigger shockwave ring on initial card
      this.addRing(this.hotCards[0]);

      // Build active interconnecting streaks between hot cards flowing from left to right
      this.run.paths = [];
      const segD = 1.35; // Duration of each progressive cable jump
      for (let k = 0; k < this.hotCards.length - 1; k++) {
        this.run.paths.push({
          bundle: this.pathBetween(this.hotCards[k], this.hotCards[k + 1]),
          t0: this.time + k * segD,
          t1: this.time + (k + 1) * segD
        });
      }

      // Smooth coordinated camera movement:
      // Real mathematical spline trajectory directly synchronized with the glowing cable beat
      const pStart = this.ctr(this.hotCards[0]);
      const pMid = this.hotCards[1] ? this.ctr(this.hotCards[1]) : pStart;
      const pEnd = this.hotCards[2] ? this.ctr(this.hotCards[2]) : pMid;
      const tNow = this.time;

      this.camTraj = {
        t0: tNow,
        keys: [
          { t: 0,                 x: pStart.x + 60,                y: pStart.y,                      z: 2.2,                              r: -0.8 },
          { t: segD * 0.7,        x: (pStart.x * 0.3 + pMid.x * 0.7), y: (pStart.y * 0.3 + pMid.y * 0.7), z: (this.cs.camTarget.z || 2.4) * 0.9, r: 0.2 },
          { t: segD,              x: pMid.x,                       y: pMid.y,                        z: this.cs.camTarget.z || 2.4,       r: 0.5 },
          { t: segD * 1.6,        x: (pMid.x * 0.4 + pEnd.x * 0.6),   y: (pMid.y * 0.4 + pEnd.y * 0.6),   z: (this.cs.camTarget.z || 2.4) * 0.85,r: -0.2 },
          { t: segD * 2,          x: pEnd.x,                       y: pEnd.y,                        z: (this.cs.camTarget.z || 2.4) * 0.95,r: -0.4 },
          { t: segD * 2 + 1.2,    x: (pMid.x + pEnd.x) / 2,        y: (pMid.y + pEnd.y) / 2,         z: Math.max(1.65, (this.cs.camTarget.z || 2.4) * 0.85), r: 0 }
        ]
      };

      // Trigger shockwaves right when the cable arrives at downstream nodes
      setTimeout(() => { if (this.hotCards[1]) this.addRing(this.hotCards[1]); }, segD * 1000);
      setTimeout(() => { if (this.hotCards[2]) this.addRing(this.hotCards[2]); }, segD * 2 * 1000);
    }

    /**
     * Synchronize live automation telemetry from dashboard SSE
     * Accurately aligns camera zoom, titles, hot cards, and metrics with real execution
     */
    syncState(isRunning, telem) {
      this.isRunning = isRunning;

      // Update bottom telemetry ribbon
      if (this.stMenu) this.stMenu.textContent = telem.currentMenu || 'Naskah Masuk';
      if (this.stDoc) {
        this.stDoc.textContent = `Doc ${telem.currentDocIndex || 0} / ${telem.totalTarget || '-'}`;
      }
      if (this.stSpeed) {
        if (isRunning) {
          const etaText = telem.etaSec ? `ETA ~${Math.ceil(telem.etaSec / 60)} mnt` : 'ETA -';
          this.stSpeed.textContent = `~${telem.avgSecPerDoc || 18}s/dok • ${etaText}`;
        } else {
          this.stSpeed.textContent = 'Standby • ETA -';
        }
      }
      if (this.stDetail) {
        this.stDetail.textContent = telem.actionDetail || (isRunning ? 'Memproses naskah...' : 'Sistem Siap');
      }
      if (this.stPctVal) {
        this.stPctVal.textContent = `${telem.percent || 0}%`;
      }
      if (this.stBarFill) {
        this.stBarFill.style.width = `${telem.percent || 0}%`;
      }

      if (!isRunning) {
        // While idle, smooth panoramic overview
        if (this.lastStageKey !== 'idle') {
          this.lastStageKey = 'idle';
          this.badgeEl.textContent = 'SISTEM STANDBY';
          this.titleEl.textContent = 'SIDIA AI READY — MENUNGGU PERINTAH';
          this.subSegs = ['Sesi Chrome Port 9222 Terdeteksi', 'Profil Aktif Tersimpan', 'Siap Jalankan Otomasi'];
          this.renderSub();
          this.pillEls.forEach(p => p.classList.remove('on'));
          this.hotCards.forEach(c => c.el.classList.remove('hot'));
          this.camTarget = { x: this.WW / 2, y: this.WH / 2, z: 1.08, r: 0 };
        }
        return;
      }

      // Map current step key to appropriate stage
      const stepKey = telem.currentStepKey || 'opening_doc';
      let stageIdx = 0;
      if (stepKey === 'auth') stageIdx = 0;
      else if (stepKey === 'navigating' || stepKey === 'tab_selection') stageIdx = 1;
      else if (stepKey === 'scanning' || stepKey === 'opening_doc') stageIdx = 2;
      else if (stepKey === 'feedback_modal' || stepKey === 'typing' || stepKey === 'skipping') stageIdx = 3;
      else if (stepKey === 'rating' || stepKey === 'saving') stageIdx = 4;
      else if (stepKey === 'completed') stageIdx = 5;

      const docIdx = telem.currentDocIndex || 1;
      const targetTot = telem.totalTarget || '-';
      const menuName = telem.currentMenu || 'Naskah Masuk';

      // Detect state or document change to trigger synchronized camera move
      const stateChanged = (this.lastStageKey !== stepKey) || (this.lastDocIndex !== docIdx);

      if (stateChanged) {
        this.lastStageKey = stepKey;
        this.lastDocIndex = docIdx;

        let dynamicTitle = `MEMPROSES DOKUMEN ${docIdx} DARI ${targetTot}`;
        let dynamicBadge = `DOK ${docIdx} / ${targetTot}`;
        let dynamicSub = `SIDIA v3.2 · ${menuName} · Doc #${docIdx} · ${telem.currentStep || 'Aktif'}`;

        if (stageIdx === 0) {
          dynamicTitle = 'SESI PROFIL & OTENTIKASI STEALTH';
          dynamicBadge = 'AUTH 01';
          dynamicSub = 'Menghubungkan Sesi Chrome · Bypass Token reCAPTCHA';
        } else if (stageIdx === 1) {
          dynamicTitle = `NAVIGASI MENU · ${menuName.toUpperCase()}`;
          dynamicBadge = `INBOX (${targetTot} DOK)`;
          dynamicSub = `Pindai Sidebar · Target ${targetTot} Naskah Masuk`;
        } else if (stageIdx === 2) {
          dynamicTitle = `MEMBUKA DOKUMEN KE-${docIdx} DARI ${targetTot}`;
          dynamicBadge = `DOK ${docIdx} / ${targetTot}`;
          dynamicSub = `Inspeksi Tombol Lihat · Membuka Lembar Disposisi`;
        } else if (stageIdx === 3) {
          dynamicTitle = `SINTESIS CATATAN DISPOSISI AI · DOK #${docIdx}`;
          dynamicBadge = `AI FEEDBACK`;
          dynamicSub = `Form Feedback Terbuka · Input Pesan: "dipedomani dan dilaksanakan"`;
        } else if (stageIdx === 4) {
          dynamicTitle = `PENILAIAN BINTANG 5 & SIMPAN · DOK #${docIdx}`;
          dynamicBadge = `SIMPAN 5★`;
          dynamicSub = `Rating 5 Bintang Dipilih · Konfirmasi Dialog · Kirim ke Server`;
        } else if (stageIdx === 5) {
          dynamicTitle = `SELURUH ${targetTot} DOKUMEN SELESAI DIPROSES`;
          dynamicBadge = `SELESAI 100%`;
          dynamicSub = `Batch Selesai · Seluruh Catatan Disposisi Tersimpan Sukses`;
        }

        const docTitle = telem.docPerihal ? `"${telem.docPerihal.slice(0, 32)}..."` : (stageIdx === 3 ? 'Catatan: Dipedomani' : `doc_${docIdx}_stream`);
        const stepDetail = telem.actionDetail || (stageIdx === 4 ? 'Rating 5★ · Simpan' : (telem.currentStep || 'Aktif'));

        const customHot = [
          {
            c: this.CASES[stageIdx].hot[0].c,
            r: this.CASES[stageIdx].hot[0].r,
            name: this.CASES[stageIdx].hot[0].name,
            chip: `${menuName} (${docIdx}/${targetTot})`
          },
          {
            c: this.CASES[stageIdx].hot[1].c,
            r: this.CASES[stageIdx].hot[1].r,
            name: docTitle,
            chip: telem.docPerihal ? telem.docPerihal.slice(0, 36) : (telem.currentStep || 'Memproses...')
          },
          {
            c: this.CASES[stageIdx].hot[2].c,
            r: this.CASES[stageIdx].hot[2].r,
            name: stageIdx === 3 ? 'feedback_writer' : 'disposisi_commit',
            chip: stepDetail
          }
        ];

        this.activateStage(stageIdx, false, {
          title: dynamicTitle,
          badge: dynamicBadge,
          sub: dynamicSub,
          hot: customHot
        });
      } else {
        // Continuous label updates if within same stage
        if (this.hotCards && this.hotCards.length === 3) {
          const chip0 = `${menuName} (${docIdx}/${targetTot})`;
          const chip1 = telem.docPerihal ? telem.docPerihal.slice(0, 36) : (telem.currentStep || 'Memproses...');
          const chip2 = telem.actionDetail || 'Aktif';

          if (this.hotCards[0].chipEl.textContent !== chip0) {
            this.typeText(this.hotCards[0].chipEl, chip0, 20, true);
          }
          if (this.hotCards[1].chipEl.textContent !== chip1) {
            this.typeText(this.hotCards[1].chipEl, chip1, 20, true);
            if (telem.docPerihal) this.hotCards[1].nameEl.textContent = `"${telem.docPerihal.slice(0, 28)}..."`;
          }
          if (this.hotCards[2].chipEl.textContent !== chip2) {
            this.typeText(this.hotCards[2].chipEl, chip2, 20, true);
          }
        }
      }
    }

    applyCam(ctx) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.translate(this.W / 2, this.H / 2);
      ctx.rotate(this.cam.r * Math.PI / 180);
      ctx.scale(this.S, this.S);
      ctx.translate(-this.cam.x, -this.cam.y);
    }

    px(n) {
      return n / this.S;
    }

    strokeCurve(ctx, l, a, b, lw, style) {
      const N = 56, i0 = Math.ceil(a * N), i1 = Math.floor(b * N);
      ctx.lineWidth = lw;
      ctx.strokeStyle = style;
      ctx.beginPath();
      const s = this.bez(l, a);
      ctx.moveTo(s.x, s.y);
      for (let i = i0; i <= i1; i++) {
        const p = this.bez(l, i / N);
        ctx.lineTo(p.x, p.y);
      }
      const e = this.bez(l, b);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
    }

    glow(ctx, x, y, r, stops) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      for (const [o, c] of stops) g.addColorStop(o, c);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }

    drawBg() {
      this.bx.setTransform(1, 0, 0, 1, 0, 0);
      this.bx.clearRect(0, 0, this.bgc.width, this.bgc.height);
      this.applyCam(this.bx);
      this.bx.strokeStyle = 'rgba(120,140,255,.055)';
      this.bx.lineWidth = this.px(1);
      this.bx.beginPath();
      for (let x = -1000; x <= this.WW + 1000; x += 90) {
        this.bx.moveTo(x, -1000);
        this.bx.lineTo(x, this.WH + 1000);
      }
      for (let y = -1000; y <= this.WH + 1000; y += 90) {
        this.bx.moveTo(-1000, y);
        this.bx.lineTo(this.WW + 1000, y);
      }
      this.bx.stroke();
    }

    drawNetwork(t) {
      this.fx.lineCap = 'round';
      for (const b of [...this.BUCKETS, this.streaks]) {
        const a = b.a * (.8 + .25 * Math.sin(t * .9 + b.links.length));
        this.fx.strokeStyle = `rgba(${b.rgb},${a.toFixed(3)})`;
        this.fx.lineWidth = this.px(1.1);
        this.fx.beginPath();
        for (const l of b.links) {
          this.fx.moveTo(l.p0.x, l.p0.y);
          this.fx.bezierCurveTo(l.c1.x, l.c1.y, l.c2.x, l.c2.y, l.p3.x, l.p3.y);
        }
        this.fx.stroke();
      }
      for (const p of this.pulses) {
        const u = (t * p.sp + p.ph) % 1;
        for (let k = 0; k < 6; k++) {
          const u0 = u - k * .014, u1 = u - (k + 1) * .014;
          if (u1 < 0) break;
          const a = this.bez(p.l, u0), b = this.bez(p.l, u1);
          this.fx.strokeStyle = `rgba(${p.rgb},${(.75 - k * .12).toFixed(2)})`;
          this.fx.lineWidth = this.px(1.8);
          this.fx.beginPath();
          this.fx.moveTo(a.x, a.y);
          this.fx.lineTo(b.x, b.y);
          this.fx.stroke();
        }
        const h = this.bez(p.l, u);
        this.glow(this.fx, h.x, h.y, this.px(7), [[0, `rgba(${p.rgb},.8)`], [1, `rgba(${p.rgb},0)`]]);
      }
    }

    drawPillars(t) {
      const top = -400, bot = this.WH + 400, span = bot - top, segs = 20, step = span / segs;
      for (const p of this.pillars) {
        const [r, g, b] = p.col, pulse = .75 + .25 * Math.sin(t * p.sp + p.ph0);
        // Soft elegant glow in background gaps
        const gw = 90, gr = this.fx.createLinearGradient(p.x - gw, 0, p.x + gw, 0);
        gr.addColorStop(0, `rgba(${r},${g},${b},0)`);
        gr.addColorStop(.5, `rgba(${r},${g},${b},${(.08 * p.base * pulse).toFixed(3)})`);
        gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        this.fx.fillStyle = gr;
        this.fx.fillRect(p.x - gw, top, gw * 2, span);

        for (const s of p.strands) {
          this.fx.lineWidth = this.px(s.w * 0.75);
          const [sr, sg, sb] = s.white ? [255, 255, 255] : [r, g, b];
          let ox = 0, oy = 0;
          for (let i = 0; i <= segs; i++) {
            const y = top + i * step, f = i / segs, edge = Math.pow(Math.abs(f - .5) * 2, 3), flare = 1 + 2.4 * edge;
            const x = p.x + s.off * flare + Math.sin(y * s.fr + t * s.sp + s.ph) * s.amp * flare;
            if (i > 0) {
              const a = s.a * p.base * pulse * (.12 + .88 * Math.pow(.5 + .5 * Math.sin(y * .007 + t * s.sp * 1.3 + s.ph * 2), 3)) * (1 - Math.pow(Math.abs(f - .5) * 2, 4) * .85);
              this.fx.strokeStyle = `rgba(${sr},${sg},${sb},${(a * 0.7).toFixed(3)})`;
              this.fx.beginPath();
              this.fx.moveTo(ox, oy);
              this.fx.lineTo(x, y);
              this.fx.stroke();
            }
            ox = x; oy = y;
          }
        }

        const cg = this.fx.createLinearGradient(0, top, 0, bot);
        const cc = `${(255 + r) >> 1},${(255 + g) >> 1},${(255 + b) >> 1}`;
        cg.addColorStop(0, `rgba(${cc},0)`);
        cg.addColorStop(.22, `rgba(${cc},${.15 * p.base})`);
        cg.addColorStop(.5, `rgba(${cc},${.65 * p.base * pulse})`);
        cg.addColorStop(.78, `rgba(${cc},${.15 * p.base})`);
        cg.addColorStop(1, `rgba(${cc},0)`);
        this.fx.fillStyle = cg;
        this.fx.fillRect(p.x - this.px(0.8), top, this.px(1.6), span);
        this.fx.globalAlpha = .2;
        this.fx.fillRect(p.x - this.px(2.5), top, this.px(5), span);
        this.fx.globalAlpha = 1;

        for (const k of p.packets) {
          const f = (((t * k.sp * k.dir + k.ph) % 1) + 1) % 1, y = top + f * span;
          this.fx.save();
          this.fx.translate(p.x, y);
          this.fx.scale(1, 5);
          this.glow(this.fx, 0, 0, 28, [[0, 'rgba(255,255,255,.85)'], [.35, `rgba(${r},${g},${b},.4)`], [1, `rgba(${r},${g},${b},0)`]]);
          this.fx.restore();
        }
      }
    }

    drawSparks(t, dt) {
      for (const s of this.sparks) {
        s.y -= s.v * dt;
        if (s.y < -250) s.y = this.WH + 250;
        const a = Math.pow(.5 + .5 * Math.sin(t * s.sp + s.ph), 4);
        this.fx.fillStyle = s.white ? `rgba(255,255,255,${(a * .9).toFixed(2)})` : `rgba(${this.cs.rgb},${(a * .9).toFixed(2)})`;
        const r = this.px(s.s);
        this.fx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
      }
    }

    drawHot(t) {
      const rgb = this.cs.rgb;

      for (const path of this.run.paths) {
        const p = this.clamp01((this.time - path.t0) / (path.t1 - path.t0));
        if (p <= 0) continue;

        path.bundle.forEach((l, i) => {
          const m = i === 0 ? 1 : .5;
          if (i === 0) this.strokeCurve(this.fx, l, 0, p, this.px(26), `rgba(${rgb},.1)`);
          this.strokeCurve(this.fx, l, 0, p, this.px(9) * m, `rgba(${rgb},${.28 * m})`);
          this.strokeCurve(this.fx, l, 0, p, this.px(3) * m, `rgba(${rgb},${.85 * m})`);
          this.strokeCurve(this.fx, l, 0, p, this.px(1.2) * m, `rgba(255,255,255,${.95 * m})`);
        });

        const main = path.bundle[0];
        if (p < 1) {
          // Glowing head orb actively shooting forward from left to right!
          const h = this.bez(main, p), R0 = Math.max(65, this.px(32));
          this.glow(this.fx, h.x, h.y, R0, [[0, 'rgba(255,255,255,.95)'], [.25, `rgba(${rgb},.7)`], [1, `rgba(${rgb},0)`]]);
        } else {
          // Flowing energy pulses continuously traversing the completed cable
          for (let k = 0; k < 3; k++) {
            const u = ((t * .35 + k / 3) % 1), h = this.bez(main, u);
            this.glow(this.fx, h.x, h.y, Math.max(34, this.px(14)), [[0, 'rgba(255,255,255,.95)'], [.4, `rgba(${rgb},.6)`], [1, `rgba(${rgb},0)`]]);
          }
        }
      }

      this.hotCards.forEach((card, k) => {
        const x = card.x + this.CW * .86, y = card.y + this.CH * .3;
        const r0 = (k === 1 ? 110 : 80) * (1 + .15 * Math.sin(t * 5 + k));
        this.glow(this.fx, x, y, r0, [[0, 'rgba(255,255,255,.95)'], [.12, `rgba(${rgb},.85)`], [.5, `rgba(${rgb},.18)`], [1, `rgba(${rgb},0)`]]);
      });

      this.run.rings = this.run.rings.filter(g => this.time - g.t0 < 1.4);
      for (const g of this.run.rings) {
        const u = (this.time - g.t0) / 1.4, r = 40 + this.ease(u) * 330;
        this.fx.lineWidth = this.px(2.4);
        this.fx.strokeStyle = `rgba(${rgb},${(.8 * (1 - u)).toFixed(2)})`;
        this.fx.beginPath();
        this.fx.arc(g.x, g.y, r, 0, 6.2832);
        this.fx.stroke();
      }
    }

    drawFg(t, dt) {
      this.fx.setTransform(1, 0, 0, 1, 0, 0);
      this.fx.clearRect(0, 0, this.fgc.width, this.fgc.height);
      this.applyCam(this.fx);
      this.fx.globalCompositeOperation = 'lighter';
      this.drawNetwork(t);
      this.drawPillars(t);
      this.drawHot(t);
      this.drawSparks(t, dt);
      this.fx.globalCompositeOperation = 'source-over';
    }

    frame(now) {
      requestAnimationFrame(t => this.frame(t));
      const dt = Math.min(.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;

      if (!this.W || !this.H || !this.fit) {
        this.resize();
        return;
      }

      if (!this.paused) {
        this.time += dt;
      }

      // Smooth camera interpolation:
      // If an active trajectory exists, sample along the cubic ease curve synchronized with the beat
      if (this.camTraj) {
        const k = this.camTraj.keys;
        const elapsed = this.time - this.camTraj.t0;
        const maxT = k[k.length - 1].t;

        if (elapsed >= maxT) {
          const finalKey = k[k.length - 1];
          this.camTarget = { x: finalKey.x, y: finalKey.y, z: finalKey.z, r: finalKey.r };
          this.camTraj = null;
        } else {
          let idx = 0;
          while (idx < k.length - 2 && elapsed > k[idx + 1].t) idx++;
          const a = k[idx], b = k[idx + 1];
          const u = this.ease(this.clamp01((elapsed - a.t) / (b.t - a.t)));

          const targetX = a.x + (b.x - a.x) * u;
          const targetY = a.y + (b.y - a.y) * u;
          const targetZ = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * u);
          const targetR = a.r + (b.r - a.r) * u;

          // Hermite direct track with responsive smoothing
          const trackLerp = Math.min(1, dt * 10);
          this.cam.x += (targetX - this.cam.x) * trackLerp;
          this.cam.y += (targetY - this.cam.y) * trackLerp;
          this.cam.z += (targetZ - this.cam.z) * trackLerp;
          this.cam.r += (targetR - this.cam.r) * trackLerp;
        }
      }

      if (!this.camTraj) {
        // Continuous smooth stabilization lerp towards steady camera target
        const lerp = Math.min(1, dt * 3.2);
        this.cam.x += (this.camTarget.x - this.cam.x) * lerp;
        this.cam.y += (this.camTarget.y - this.cam.y) * lerp;
        this.cam.z += (this.camTarget.z - this.cam.z) * lerp;
        this.cam.r += (this.camTarget.r - this.cam.r) * lerp;
      }

      // Subtle organic breathing drift that feels alive
      const driftX = Math.sin(this.time * 0.6) * (14 / this.cam.z);
      const driftY = Math.cos(this.time * 0.53) * (10 / this.cam.z);
      const driftR = Math.sin(this.time * 0.41) * 0.25;
      const driftZ = 1 + 0.015 * Math.sin(this.time * 0.9);

      const renderX = this.cam.x + driftX;
      const renderY = this.cam.y + driftY;
      const renderR = this.cam.r + driftR;
      this.S = this.fit * this.cam.z * driftZ;

      this.world.style.transform = `translate(${this.W / 2}px,${this.H / 2}px) rotate(${renderR}deg) scale(${this.S}) translate(${-renderX}px,${-renderY}px)`;
      this.drawBg();
      this.drawFg(this.time, this.paused ? 0 : dt);
    }
  }

  window.DecisionGrid = DecisionGrid;
})();
