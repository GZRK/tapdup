(() => {
  'use strict';
  const api='https://tapdup-stripe.late-sky-1b25.workers.dev/admin/enquiries';
  const $=id=>document.getElementById(id);
  let key='',offset=0,next=null,sequence=0,active;
  const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
  function signOut(){sequence++;active?.abort();key='';$('access-key').value='';$('enquiry-list').replaceChildren();$('login').hidden=false;$('admin').hidden=true;$('admin-status').textContent='Signed out.';}
  async function update(id,status){
    if(!key)return;
    const session=sequence;
    $('admin-status').textContent='Saving status…';
    try{
      const response=await fetch(api,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({id,status}),signal:AbortSignal.timeout(10000)});
      if(session!==sequence)return;
      if(response.status===401){signOut();throw Error('Your access key was not accepted.');}
      const result=await response.json();if(!response.ok||result.updated!==true)throw Error(result.error||'Status was not saved.');
      await load();
    }catch(e){if(key)$('admin-status').textContent=e.message;}
  }
  function render(rows){
    $('enquiry-list').replaceChildren();
    if(!rows.length)$('enquiry-list').append(text('p','No enquiries match this filter.'));
    for(const row of rows){
      const details=document.createElement('details'),summary=text('summary',row.details.customer.name+' · '+row.details.packageName+' · '+row.status);details.append(summary);
      const dl=document.createElement('dl'),d=row.details,c=d.customer;
      const fields=[['Reference',row.id],['Received (UTC)',row.created_at],['Scheduled removal (UTC)',row.delete_after || 'Not closed'],['Name',c.name],['Email',c.email],['Mobile',c.mobile||'Not provided'],['Postcode',c.postcode],['Preferred delivery',d.deliveryDate||'To discuss'],['Preferred collection',d.collectionDate||'To discuss'],['Preferred party start',d.partyStartTime||'To discuss'],['Drink',d.drink||'To discuss'],['Extras',d.extras.map(e=>e.name+(e.detail?' — '+e.detail:'')).join('\n')||'None'],['Message',c.notes||'None'],['Optional address',[c.address1,c.address2,c.town].filter(Boolean).join(', ')||'Not provided'],['Guests',c.guests||'Not provided']];
      for(const [label,value]of fields)dl.append(text('dt',label),text('dd',value));details.append(dl);
      details.append(text('h3','Email status'));
      for(const email of row.emails)details.append(text('p',email.kind+': '+email.status+' · delivery: '+email.delivery_status+(email.last_error?' · '+email.last_error:'')));
      if(!row.emails.length)details.append(text('p','No email queue entries recorded.'));
      const controls=document.createElement('div');controls.className='admin-status';
      for(const status of ['new','contacted','closed']){const button=text('button','Mark '+status);button.type='button';button.disabled=row.status===status;button.addEventListener('click',()=>update(row.id,status));controls.append(button);}
      details.append(controls);$('enquiry-list').append(details);
    }
  }
  async function load(){
    if(!key)return;
    active?.abort();const controller=new AbortController();active=controller;const serial=++sequence;
    $('refresh').disabled=true;$('admin-status').textContent='Loading enquiries…';
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(api+'?status='+encodeURIComponent($('status-filter').value)+'&offset='+offset,{headers:{Authorization:'Bearer '+key},cache:'no-store',signal:controller.signal});
      if(serial!==sequence)return;
      const result=await response.json();
      if(response.status===401){signOut();throw Error('Your access key was not accepted.');}
      if(!response.ok)throw Error(result.error||'Could not load enquiries.');
      if(!Array.isArray(result.enquiries))throw Error('Could not read enquiries.');
      $('login').hidden=true;$('admin').hidden=false;$('access-key').value='';render(result.enquiries);
      next=result.next_offset;$('more').hidden=!result.has_more;
      $('admin-status').textContent=result.enquiries.length+' enquiries shown. Email accepted means accepted by the provider; delivery is shown separately.';
    }catch(e){if(serial===sequence || !key)$('admin-status').textContent=e.name==='AbortError'?'The request timed out. Please try again.':e.message;}
    finally{clearTimeout(timer);if(serial===sequence)$('refresh').disabled=false;}
  }
  $('login-form').addEventListener('submit',e=>{e.preventDefault();key=$('access-key').value;offset=0;load();});
  $('logout').addEventListener('click',signOut);
  $('refresh').addEventListener('click',load);
  $('status-filter').addEventListener('change',()=>{offset=0;load();});
  $('more').addEventListener('click',()=>{if(next!==null){offset=next;load();}});
})();
