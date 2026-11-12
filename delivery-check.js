(() => {
  'use strict';
  const input = document.getElementById('postcode') || document.getElementById('customer-postcode');
  const review = !input && document.querySelector('.terms-check');
  if (!input && !review) return;
  const panel = document.createElement('section');
  panel.className = 'tapdup-delivery-check';
  panel.setAttribute('aria-label', 'Delivery area');
  const title = document.createElement('h3'); title.textContent = 'Delivery area';
  const result = document.createElement('p'); result.setAttribute('role', 'status'); result.setAttribute('aria-live', 'polite');
  result.textContent = 'Enter your full event postcode to check our standard delivery area.';
  const check = document.createElement('button'); check.type = 'button'; check.textContent = 'Check delivery area';
  const contact = document.createElement('a'); contact.href = 'contact.html'; contact.className = 'tapdup-delivery-contact';
  contact.textContent = 'Contact us about delivery'; contact.hidden = true;
  panel.append(title, result, check, contact);
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
    const current = ++revision, postcode = normalise(value()); contact.hidden = true;
    if (!/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(postcode)) {
      result.textContent = 'Enter a complete UK postcode, for example NP23 6AA. If you need help, contact us about delivery.';
      contact.hidden = false; return;
    }
    result.textContent = 'Checking delivery area…';
    try {
      const allowed = await list(); if (current !== revision) return;
      if (allowed.has(postcode)) {
        result.textContent = 'Your postcode is inside our standard delivery area. You can continue with your enquiry. Dates, access and any delivery charge still need confirmation; this does not reserve a booking.';
      } else {
        result.textContent = 'Your postcode is not in our automatic delivery area list. Please contact us to discuss delivery and any additional charge. You can also send an enquiry using this form.';
        contact.hidden = false;
      }
    } catch {
      if (current !== revision) return;
      result.textContent = 'We could not check delivery coverage. Please contact us about delivery, or send your enquiry for a manual check.';
      contact.hidden = false;
    }
  }
  check.addEventListener('click', run);
  if (input) {
    input.addEventListener('input', () => { revision++; contact.hidden = true; result.textContent = 'Check your updated event postcode before continuing.'; });
    input.addEventListener('blur', () => { if (input.value.trim()) run(); });
  } else run();
})();
