(() => {
  'use strict';
  const api = 'https://tapdup-stripe.late-sky-1b25.workers.dev';
  const button = document.getElementById('send-enquiry');
  if (!button) return;
  const status = document.getElementById('enquiry-status');
  const privacy = document.getElementById('privacyAcknowledged');
  const form = document.getElementById('enquiry-form');
  let token = '', widgetId, busy = false, feedback = '';
  button.disabled = true;
  const message = text => { status.textContent = text; };
  const value = id => document.getElementById(id)?.value.trim() || '';

  function details() {
    if (!form) {
      let booking;
      try { booking = JSON.parse(sessionStorage.getItem('tapdupBooking') || 'null'); } catch {}
      if (!booking?.customer) throw Error('Choose your package and enter your contact details first.');
      return { ...booking, privacyAcknowledged: true };
    }
    return {
      packageType: value('packageType'), deliveryDate: value('deliveryDate'), collectionDate: value('collectionDate'),
      partyStartTime: value('partyStartTime'), drink: value('drink'), extras: [], privacyAcknowledged: true,
      customer: { name:value('name'),email:value('email'),mobile:value('mobile'),postcode:value('postcode'),notes:value('notes'),guests:value('guests') },
    };
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (form && !form.reportValidity()) return;
    if (!privacy.checked) { message('Please read and acknowledge the privacy notice.'); privacy.focus(); return; }
    if (!token) { message('Please complete the security check.'); return; }
    busy = true; feedback = ''; button.disabled = true; button.textContent = 'Sending enquiry…';
    let success = false;
    try {
      const enquiry = details();
      const snapshot = JSON.stringify(enquiry);
      let prior; try { prior = JSON.parse(sessionStorage.getItem('tapdupEnquiryRequest') || 'null'); } catch {}
      const requestId = prior?.snapshot === snapshot && /^[0-9a-f-]{36}$/i.test(prior.id || '') ? prior.id : crypto.randomUUID();
      sessionStorage.setItem('tapdupEnquiryRequest',JSON.stringify({id:requestId,snapshot}));
      message('Sending your enquiry…');
      const response = await fetch(api + '/enquiries', {
        method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
        body:JSON.stringify({request_id:requestId,enquiry,turnstileToken:token,website:value('contact-website')}),
      });
      let result; try { result = await response.json(); } catch { throw Error('We could not confirm receipt. Please try again or email hello@tapdup.co.uk.'); }
      if (![200,201].includes(response.status) || result.status!=='received' || result.enquiry_reference!==requestId) {
        if(response.status===409)sessionStorage.removeItem('tapdupEnquiryRequest');
        throw Error(typeof result.error==='string'?result.error:'Your enquiry was not confirmed. Please try again.');
      }
      const receipt={status:'received',reference:result.enquiry_reference,message:result.message,savedAt:Date.now()};
      sessionStorage.setItem('tapdupEnquiryReceipt',JSON.stringify(receipt));
      sessionStorage.removeItem('tapdupBooking');
      sessionStorage.removeItem('tapdupCheckoutRequest');
      sessionStorage.removeItem('tapdupEnquiryRequest');
      success=true;
      location.assign('enquiry-success.html?reference='+encodeURIComponent(receipt.reference));
    } catch(error) {
      feedback=error.name==='TimeoutError' || error.name==='AbortError' ? 'The request timed out. Your details are kept here. Please retry after the security check; this will reuse your enquiry reference.' : error.message || 'We could not confirm receipt. Please try again.';
      message(feedback);
    } finally {
      token=''; busy=false;
      if(widgetId!==undefined && window.turnstile)window.turnstile.reset(widgetId);
      button.disabled=true; button.textContent='Send enquiry';
      if(success)message('Your enquiry has been saved. Opening your receipt…');
    }
  }
  if(form)form.addEventListener('submit',submit);else button.addEventListener('click',submit);
  if(form) {
    const requested=new URLSearchParams(location.search).get('package');
    if(['30','50','crown','custom'].includes(requested))document.getElementById('packageType').value=requested;
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    document.getElementById('deliveryDate').min=today;
    document.getElementById('deliveryDate').addEventListener('change',()=>{
      const date=value('deliveryDate');
      document.getElementById('collectionDate').min=date?new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10):today;
    });
  }
  window.tapdupTurnstileReady=()=>{
    widgetId=window.turnstile.render('#enquiry-turnstile',{
      sitekey:window.tapdupEnquirySitekey,action:'tapdup-enquiry',
      callback:value=>{token=value;button.disabled=busy;message(feedback ? feedback+' Security check complete; you can retry.' : 'Security check complete. You can send your enquiry.');},
      'expired-callback':()=>{token='';button.disabled=true;message('The security check expired. Please complete it again.');},
      'error-callback':()=>{token='';button.disabled=true;message('The security check could not load. Refresh this page or email hello@tapdup.co.uk.');},
    });
  };
  (async()=>{
    try {
      const response=await fetch(api+'/enquiry-config',{cache:'no-store',signal:AbortSignal.timeout(10000)});
      const config=await response.json();
      if(!response.ok || config.enabled!==true || typeof config.sitekey!=='string' || !config.sitekey)throw Error('Enquiries unavailable');
      window.tapdupEnquirySitekey=config.sitekey;
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=tapdupTurnstileReady&render=explicit';
      script.async=true;script.defer=true;script.onerror=()=>message('The security check could not load. Refresh this page or email hello@tapdup.co.uk.');
      document.head.append(script);
      message('Complete the security check before sending.');
    } catch { message('Online enquiries are temporarily unavailable. Please email hello@tapdup.co.uk or call 07962 717784.'); }
  })();
})();
