/* Buku Kas UMKM — logika aplikasi */

var state = {
  token: localStorage.getItem('bk_token') || '',
  nama: localStorage.getItem('bk_nama') || '',
  email: localStorage.getItem('bk_email') || '',
  profile: {},
  view: 'dashboard',
  laporanCache: null,
};

var KATEGORI_MASUK = ['Penjualan', 'Piutang Diterima', 'Modal', 'Pendapatan Lainnya'];
var KATEGORI_KELUAR = ['Pembelian Stok', 'Operasional', 'Gaji Karyawan', 'Sewa Tempat', 'Listrik & Air', 'Transportasi', 'Lainnya'];
var BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/* ================= UTIL ================= */

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtIDR(n) {
  n = Number(n) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

function fmtDate(iso) {
  if (!iso) return '-';
  var p = String(iso).substring(0, 10).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
}

function fmtBulan(ym) {
  var p = String(ym || '').split('-');
  if (p.length !== 2) return ym;
  return BULAN_SINGKAT[Number(p[1]) - 1] + ' ' + p[0];
}

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function firstDayOfMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
}

function withToken(params) {
  return Object.assign({ token: state.token }, params || {});
}

var toastTimer = null;
function toast(msg, type) {
  var el = $('#toast');
  el.textContent = msg;
  el.className = 'toast ' + (type || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.className = 'toast hidden'; }, 3200);
}

function handleError(err) {
  var msg = (err && err.message) ? err.message : String(err);
  if (/Sesi berakhir|Belum login|Token tidak valid/i.test(msg)) {
    forceLogout();
    toast(msg, 'error');
    return;
  }
  toast(msg, 'error');
}

function setLoading(btn, on, label) {
  if (!btn) return;
  if (on) {
    btn.dataset.label = btn.textContent;
    btn.textContent = label || 'MEMUAT…';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.label || btn.textContent;
    btn.disabled = false;
  }
}

/* ================= AUTH & SHELL ================= */

function saveSession(token, nama, email) {
  state.token = token; state.nama = nama; state.email = email;
  localStorage.setItem('bk_token', token);
  localStorage.setItem('bk_nama', nama);
  localStorage.setItem('bk_email', email);
}

function clearSession() {
  state.token = ''; state.nama = ''; state.email = '';
  localStorage.removeItem('bk_token');
  localStorage.removeItem('bk_nama');
  localStorage.removeItem('bk_email');
}

function showLogin() {
  $('#auth-screen').classList.remove('hidden');
  $('#app').classList.add('hidden');
}

function showApp() {
  $('#auth-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#user-name').textContent = state.nama;
  $('#user-email').textContent = state.email;
  $('#user-avatar').textContent = (state.nama || 'A').charAt(0).toUpperCase();
  updateBrand();
}

function forceLogout() {
  clearSession();
  showLogin();
}

function updateBrand() {
  var namaUmkm = (state.profile && state.profile.nama_umkm) || '';
  $('#auth-brand').textContent = namaUmkm || 'Buku Kas UMKM';
  $('#side-brand').textContent = namaUmkm || 'Buku Kas';
  $('#side-owner').textContent = (state.profile && state.profile.pemilik) || 'UMKM';
  document.title = (namaUmkm ? namaUmkm + ' — ' : '') + 'Buku Kas UMKM';
}

function bindAuthForms() {
  $('#tab-login').addEventListener('click', function () {
    $('#tab-login').classList.add('active');
    $('#tab-register').classList.remove('active');
    $('#form-login').classList.remove('hidden');
    $('#form-register').classList.add('hidden');
  });
  $('#tab-register').addEventListener('click', function () {
    $('#tab-register').classList.add('active');
    $('#tab-login').classList.remove('active');
    $('#form-register').classList.remove('hidden');
    $('#form-login').classList.add('hidden');
  });

  $('#form-login').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('#btn-login');
    setLoading(btn, true, 'MEMERIKSA…');
    try {
      var d = await apiCall('login', null, {
        email: $('#login-email').value,
        password: $('#login-password').value,
      });
      saveSession(d.token, d.nama, d.email);
      showApp();
      await openView('dashboard');
      toast('Selamat datang, ' + d.nama, 'success');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(btn, false);
    }
  });

  $('#form-register').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('#btn-register');
    setLoading(btn, true, 'MEMBUAT AKUN…');
    try {
      var d = await apiCall('register', null, {
        nama: $('#reg-nama').value,
        email: $('#reg-email').value,
        password: $('#reg-password').value,
      });
      saveSession(d.token, d.nama, d.email);
      showApp();
      await openView('dashboard');
      toast('Akun dibuat. Selamat datang, ' + d.nama, 'success');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(btn, false);
    }
  });

  $('#btn-logout').addEventListener('click', async function () {
    try { await apiCall('logout', { token: state.token }); } catch (e) { /* abaikan */ }
    clearSession();
    showLogin();
    toast('Anda telah keluar');
  });
}

/* ================= NAVIGASI ================= */

function bindNav() {
  $$('.menu-item').forEach(function (btn) {
    btn.addEventListener('click', function () { openView(btn.dataset.view); });
  });
}

async function openView(name) {
  state.view = name;
  $$('.menu-item').forEach(function (b) { b.classList.toggle('active', b.dataset.view === name); });
  $$('.view').forEach(function (v) { v.classList.add('hidden'); });
  var el = $('#view-' + name);
  if (el) el.classList.remove('hidden');
  window.scrollTo(0, 0);

  try {
    if (name === 'dashboard') await renderDashboard();
    else if (name === 'masuk') await renderTxView('masuk');
    else if (name === 'keluar') await renderTxView('keluar');
    else if (name === 'laporan') await renderLaporan();
    else if (name === 'profil') renderProfilForm();
  } catch (err) {
    handleError(err);
  }
}

/* ================= DASHBOARD ================= */

async function renderDashboard() {
  var d = await apiCall('summary', withToken());
  var t = d.total;

  $('#card-saldo').textContent = fmtIDR(t.saldo);
  $('#card-masuk').textContent = fmtIDR(t.masuk_bulan_ini);
  $('#card-keluar').textContent = fmtIDR(t.keluar_bulan_ini);
  $('#card-masuk-n').textContent = t.transaksi_bulan_ini + ' transaksi bulan ini';
  $('#card-keluar-n').textContent = 'Semua saldo: ' + fmtIDR(t.masuk) + ' masuk / ' + fmtIDR(t.keluar) + ' keluar';
  $('#dash-period').textContent = 'Ringkasan per ' + fmtDate(todayStr()) + '.';

  renderChart(d.per_bulan);
  $('#dash-recent').innerHTML = d.terbaru.length
    ? txTable(d.terbaru, { actions: false })
    : '<p class="empty-note">Belum ada transaksi. Mulai catat di menu Uang Masuk atau Uang Keluar.</p>';
}

function renderChart(perBulan) {
  var max = 1;
  perBulan.forEach(function (m) { max = Math.max(max, m.masuk, m.keluar); });
  $('#dash-chart').innerHTML = perBulan.map(function (m) {
    var hIn = Math.max(2, Math.round((m.masuk / max) * 100));
    var hOut = Math.max(2, Math.round((m.keluar / max) * 100));
    return (
      '<div class="col">' +
        '<div class="bars">' +
          '<div class="bar in" title="' + escHtml(fmtIDR(m.masuk)) + '" style="height:' + hIn + '%"></div>' +
          '<div class="bar out" title="' + escHtml(fmtIDR(m.keluar)) + '" style="height:' + hOut + '%"></div>' +
        '</div>' +
        '<span class="lbl">' + escHtml(fmtBulan(m.bulan)) + '</span>' +
      '</div>'
    );
  }).join('');
}

/* ================= TABEL TRANSAKSI ================= */

function txTable(list, opts) {
  var showActions = opts && opts.actions;
  var rows = list.map(function (r) {
    var isIn = r.jenis === 'MASUK';
    return (
      '<tr>' +
        '<td>' + escHtml(fmtDate(r.tanggal)) + '</td>' +
        '<td><strong>' + escHtml(r.kategori) + '</strong>' +
          (r.keterangan ? '<br><span class="ket">' + escHtml(r.keterangan) + '</span>' : '') + '</td>' +
        '<td>' + escHtml(r.metode || '-') + '</td>' +
        '<td class="num ' + (isIn ? 'amt-in' : 'amt-out') + '">' +
          (isIn ? '+' : '−') + ' ' + fmtIDR(r.jumlah) + '</td>' +
        (showActions
          ? '<td><div class="row-actions">' +
              '<button type="button" onclick="startEditTx(\'' + r.id + '\',\'' + r.jenis + '\')">Ubah</button>' +
              '<button type="button" class="danger" onclick="deleteTx(\'' + r.id + '\',\'' + r.jenis + '\')">Hapus</button>' +
            '</div></td>'
          : '') +
      '</tr>'
    );
  }).join('');
  return (
    '<div class="table-wrap"><table>' +
      '<thead><tr><th>Tanggal</th><th>Kategori</th><th>Metode</th><th style="text-align:right">Jumlah</th>' +
      (showActions ? '<th></th>' : '') + '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div>'
  );
}

/* ================= UANG MASUK / KELUAR ================= */

function fillDatalist(id, items) {
  $('#' + id).innerHTML = items.map(function (k) { return '<option value="' + escHtml(k) + '">'; }).join('');
}

function bindTxForm(kind) {
  $('#form-' + kind).addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('#btn-' + kind + '-submit');
    var id = $('#' + kind + '-id').value;
    setLoading(btn, true, 'MENYIMPAN…');
    try {
      var payload = {
        token: state.token,
        tanggal: $('#' + kind + '-tanggal').value,
        jenis: kind === 'masuk' ? 'MASUK' : 'KELUAR',
        kategori: $('#' + kind + '-kategori').value,
        jumlah: $('#' + kind + '-jumlah').value,
        metode: $('#' + kind + '-metode').value,
        keterangan: $('#' + kind + '-keterangan').value,
      };
      if (id) {
        payload.id = id;
        await apiCall('tx.update', null, payload);
        toast('Transaksi diperbarui', 'success');
      } else {
        await apiCall('tx.add', null, payload);
        toast('Transaksi tersimpan', 'success');
      }
      resetTxForm(kind);
      await renderTxView(kind);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(btn, false);
    }
  });

  $('#btn-' + kind + '-cancel').addEventListener('click', function () { resetTxForm(kind); });
}

function resetTxForm(kind) {
  $('#' + kind + '-id').value = '';
  $('#form-' + kind).reset();
  $('#' + kind + '-tanggal').value = todayStr();
  $('#form-' + kind + '-title').textContent = kind === 'masuk' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran';
  $('#btn-' + kind + '-submit').textContent = 'SIMPAN';
  $('#btn-' + kind + '-cancel').classList.add('hidden');
}

async function renderTxView(kind) {
  var list = await apiCall('tx.list', withToken({ jenis: kind === 'masuk' ? 'MASUK' : 'KELUAR', limit: 300 }));
  $('#' + kind + '-list').innerHTML = list.length
    ? txTable(list, { actions: true })
    : '<p class="empty-note">Belum ada transaksi ' + (kind === 'masuk' ? 'pemasukan' : 'pengeluaran') + '.</p>';
  resetTxForm(kind);
}

// dipanggil dari tombol "Ubah" di tabel
async function startEditTx(id, jenis) {
  var kind = jenis === 'MASUK' ? 'masuk' : 'keluar';
  try {
    var list = await apiCall('tx.list', withToken({ jenis: jenis, limit: 1000 }));
    var r = list.filter(function (x) { return x.id === id; })[0];
    if (!r) { toast('Transaksi tidak ditemukan', 'error'); return; }
    if (state.view !== kind) await openView(kind);
    $('#' + kind + '-id').value = r.id;
    $('#' + kind + '-tanggal').value = String(r.tanggal).substring(0, 10);
    $('#' + kind + '-kategori').value = r.kategori;
    $('#' + kind + '-jumlah').value = r.jumlah;
    $('#' + kind + '-metode').value = r.metode || 'Tunai';
    $('#' + kind + '-keterangan').value = r.keterangan || '';
    $('#form-' + kind + '-title').textContent = 'Ubah Transaksi';
    $('#btn-' + kind + '-submit').textContent = 'SIMPAN PERUBAHAN';
    $('#btn-' + kind + '-cancel').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) { handleError(err); }
}

// dipanggil dari tombol "Hapus" di tabel
async function deleteTx(id, jenis) {
  if (!confirm('Hapus transaksi ini? Tindakan tidak bisa dibatalkan.')) return;
  try {
    await apiCall('tx.delete', null, { token: state.token, id: id });
    toast('Transaksi dihapus', 'success');
    await renderTxView(jenis === 'MASUK' ? 'masuk' : 'keluar');
    if (state.view === 'dashboard') await renderDashboard();
  } catch (err) { handleError(err); }
}

/* ================= LAPORAN ================= */

function bindLaporan() {
  $('#form-laporan').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = e.target.querySelector('.btn-primary');
    setLoading(btn, true, 'MEMUAT…');
    try {
      state.laporanCache = await apiCall('report', withToken({
        dari: $('#lap-dari').value,
        sampai: $('#lap-sampai').value,
      }));
      renderLaporanResult(state.laporanCache);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(btn, false);
    }
  });

  $('#btn-csv').addEventListener('click', exportCSV);
  $('#btn-print').addEventListener('click', function () { window.print(); });
}

async function renderLaporan() {
  if (!$('#lap-dari').value) $('#lap-dari').value = firstDayOfMonth();
  if (!$('#lap-sampai').value) $('#lap-sampai').value = todayStr();
  // muat otomatis rentang bulan berjalan
  var btn = $('#form-laporan .btn-primary');
  if (!state.laporanCache) {
    setLoading(btn, true, 'MEMUAT…');
    try {
      state.laporanCache = await apiCall('report', withToken({
        dari: $('#lap-dari').value,
        sampai: $('#lap-sampai').value,
      }));
      renderLaporanResult(state.laporanCache);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(btn, false);
    }
  }
}

function renderLaporanResult(r) {
  $('#laporan-empty').classList.add('hidden');
  $('#laporan-result').classList.remove('hidden');

  var umkm = (state.profile && state.profile.nama_umkm) || 'UMKM Saya';
  $('#lap-cards').innerHTML =
    '<div class="card card-in"><span class="card-label">Total Masuk</span><strong>' + fmtIDR(r.total_masuk) + '</strong></div>' +
    '<div class="card card-out"><span class="card-label">Total Keluar</span><strong>' + fmtIDR(r.total_keluar) + '</strong></div>' +
    '<div class="card"><span class="card-label">Selisih (' + escHtml(umkm) + ')</span><strong>' + fmtIDR(r.saldo) + '</strong><small>' +
      fmtDate(r.dari) + ' — ' + fmtDate(r.sampai) + '</small></div>';

  $('#lap-bulan').innerHTML = r.per_bulan.length
    ? '<div class="table-wrap"><table><thead><tr><th>Bulan</th><th style="text-align:right">Masuk</th><th style="text-align:right">Keluar</th><th style="text-align:right">Selisih</th></tr></thead><tbody>' +
      r.per_bulan.map(function (b) {
        return '<tr><td>' + escHtml(fmtBulan(b.bulan)) + '</td>' +
          '<td class="num amt-in">' + fmtIDR(b.masuk) + '</td>' +
          '<td class="num amt-out">' + fmtIDR(b.keluar) + '</td>' +
          '<td class="num">' + fmtIDR(b.masuk - b.keluar) + '</td></tr>';
      }).join('') + '</tbody></table></div>'
    : '<p class="empty-note">Tidak ada data pada rentang ini.</p>';

  var sorted = r.per_kategori.slice().sort(function (a, b2) { return b2.total - a.total; });
  $('#lap-kategori').innerHTML = sorted.length
    ? '<div class="table-wrap"><table><thead><tr><th>Kategori</th><th>Jenis</th><th style="text-align:right">Total</th><th style="text-align:right">Trx</th></tr></thead><tbody>' +
      sorted.map(function (k) {
        return '<tr><td><strong>' + escHtml(k.kategori) + '</strong></td>' +
          '<td>' + (k.jenis === 'MASUK' ? '<span class="amt-in">Masuk</span>' : '<span class="amt-out">Keluar</span>') + '</td>' +
          '<td class="num">' + fmtIDR(k.total) + '</td>' +
          '<td class="num">' + k.jumlah_transaksi + '</td></tr>';
      }).join('') + '</tbody></table></div>'
    : '<p class="empty-note">Tidak ada data pada rentang ini.</p>';

  $('#lap-daftar').innerHTML = r.daftar.length
    ? txTable(r.daftar, { actions: false })
    : '<p class="empty-note">Tidak ada transaksi pada rentang ini.</p>';
}

function csvCell(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function exportCSV() {
  var r = state.laporanCache;
  if (!r) { toast('Muat laporan terlebih dahulu', 'error'); return; }
  var lines = [['Tanggal', 'Jenis', 'Kategori', 'Jumlah', 'Metode', 'Keterangan'].map(csvCell).join(';')];
  r.daftar.forEach(function (t) {
    lines.push([fmtDate(t.tanggal), t.jenis, t.kategori, t.jumlah, t.metode, t.keterangan].map(csvCell).join(';'));
  });
  var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'laporan-buku-kas-' + (r.dari || 'semua') + '_' + (r.sampai || 'semua') + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/* ================= PROFIL ================= */

function renderProfilForm() {
  var p = state.profile || {};
  $('#prof-nama_umkm').value = p.nama_umkm || '';
  $('#prof-pemilik').value = p.pemilik || '';
  $('#prof-telepon').value = p.telepon || '';
  $('#prof-alamat').value = p.alamat || '';
  $('#prof-catatan').value = p.catatan || '';
}

function bindProfil() {
  $('#form-profil').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('#btn-profil');
    setLoading(btn, true, 'MENYIMPAN…');
    try {
      state.profile = await apiCall('profile.save', null, {
        token: state.token,
        nama_umkm: $('#prof-nama_umkm').value,
        pemilik: $('#prof-pemilik').value,
        telepon: $('#prof-telepon').value,
        alamat: $('#prof-alamat').value,
        catatan: $('#prof-catatan').value,
      });
      updateBrand();
      toast('Profil tersimpan', 'success');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(btn, false);
    }
  });
}

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', async function () {
  fillDatalist('list-masuk', KATEGORI_MASUK);
  fillDatalist('list-keluar', KATEGORI_KELUAR);

  bindAuthForms();
  bindNav();
  bindTxForm('masuk');
  bindTxForm('keluar');
  bindLaporan();
  bindProfil();

  // profil UMKM untuk branding (boleh tanpa login)
  try { state.profile = await apiCall('profile.get'); } catch (e) { /* abaikan */ }
  updateBrand();

  if (state.token) {
    // verifikasi token masih valid
    try {
      await apiCall('summary', withToken());
      showApp();
      await openView('dashboard');
      return;
    } catch (err) {
      if (!/Sesi berakhir|Token tidak valid|Belum login/i.test((err && err.message) || '')) {
        handleError(err);
      }
      clearSession();
    }
  }
  showLogin();
});
