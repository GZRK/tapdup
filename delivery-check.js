(() => {
  'use strict';
  const input = document.getElementById('postcode') || document.getElementById('customer-postcode');
  const review = !input && document.querySelector('.terms-check');
  if (!input && !review) return;
  const panel = document.createElement('section');
  panel.className = 'tapdup-delivery-check';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Delivery area');
  const title = document.createElement('h3'); title.textContent = 'Outside our usual delivery area?';
  const result = document.createElement('p'); result.setAttribute('role', 'status'); result.setAttribute('aria-live', 'polite');
  const contact = document.createElement('a'); contact.href = 'contact.html'; contact.className = 'tapdup-delivery-contact';
  contact.textContent = 'Contact us about delivery';
  panel.append(title, result, contact);
  if (input) input.parentElement.append(panel); else review.parentElement.insertBefore(panel, review);
  let postcodeSet, pending, revision = 0;
  const normalise = value => String(value || '').toUpperCase().replace(/\s+/g, '');
  function value() {
    if (input) return input.value;
    try { return JSON.parse(sessionStorage.getItem('tapdupBooking') || 'null')?.customer?.postcode || ''; } catch { return ''; }
  }
  async function list() {
    if (postcodeSet) return postcodeSet;
    if (!pending) pending = fetch('delivery-postcodes.json', {signal: AbortSignal.timeout(10000)}).then(async response => {
      if (!response.ok) throw Error('Postcode list unavailable');
      const data = await response.json();
      if (!Array.isArray(data.postcodes) || !data.postcodes.length) throw Error('Invalid postcode list');
      postcodeSet = new Set(data.postcodes.map(normalise)); return postcodeSet;
    }).catch(error => { pending = undefined; throw error; });
    return pending;
  }
  async function run() {
    const current = ++revision, postcode = normalise(value()); panel.hidden = true;
    if (!/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(postcode)) {
      return;
    }
    try {
      const allowed = await list(); if (current !== revision) return;
      if (!allowed.has(postcode)) {
        title.textContent = 'Outside our usual delivery area?';
        result.textContent = 'We may still be able to help. Contact us to discuss delivery and any additional charge, or send us an enquiry.';
        panel.hidden = false;
      }
    } catch {
      if (current !== revision) return;
      result.textContent = 'We could not check delivery coverage. Please contact us about delivery, or send your enquiry for a manual check.';
      title.textContent = 'Please ask us about delivery';
      panel.hidden = false;
    }
  }
  if (input) {
    input.addEventListener('input', () => { revision++; panel.hidden = true; });
    input.addEventListener('blur', () => { if (input.value.trim()) run(); });
  } else run();
})();
