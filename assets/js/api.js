/* Klien API untuk backend Apps Script (Google Sheets) */

const CONFIG = {
  // >>> GANTI dengan URL Web App Apps Script Anda (diakhiri /exec) <<<
  // Contoh: 'https://script.google.com/macros/s/AKfycbxxxxxxxx/exec'
  BASE_URL: 'https://script.google.com/macros/s/AKfycbz-EJa3R5RFSJ--ErNix0TOr63SoSK75qEyua6uuK19fOrMOzxrqaGnrfYuxxtuW4cxJg/exec',
};

/**
 * Panggil API.
 * @param {string} action  nama aksi (lihat Code.gs)
 * @param {object} params  untuk GET (query string)
 * @param {object|null} payload  jika diisi, request pakai POST (body JSON)
 */
async function apiCall(action, params, payload) {
  if (CONFIG.BASE_URL.indexOf('http') !== 0) {
    throw new Error('URL API belum diatur. Isi CONFIG.BASE_URL di assets/js/api.js');
  }

  var res;
  if (payload) {
    // Content-Type text/plain supaya lolos CORS tanpa preflight di Apps Script
    res = await fetch(CONFIG.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, payload)),
    });
  } else {
    var qs = new URLSearchParams(Object.assign({ action: action }, params || {})).toString();
    res = await fetch(CONFIG.BASE_URL + '?' + qs);
  }

  var json = await res.json().catch(function () { return null; });
  if (!json) throw new Error('Respon server tidak valid');
  if (json.status === 'error') throw new Error(json.message || 'Terjadi kesalahan pada server');
  return json.data;
}
