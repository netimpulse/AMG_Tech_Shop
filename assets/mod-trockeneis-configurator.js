
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.mtc').forEach(function(root){
    var sid=root.closest('[id^="shopify-section-"]')?.id?.replace('shopify-section-','');
    if(!sid)return;
    var varJson=document.getElementById('mtc-variants-'+sid);
    if(!varJson)return;
    var variants=JSON.parse(varJson.textContent);
    var config=document.getElementById('mtc-config-'+sid);
    var priceEl=document.getElementById('mtc-price-'+sid);
    var unitEl=document.getElementById('mtc-unit-'+sid);
    var variantInput=document.getElementById('mtc-variant-'+sid);
    var addBtn=document.getElementById('mtc-add-'+sid);
    var qtyInput=document.getElementById('mtc-qty-'+sid);
    var qtyHidden=document.getElementById('mtc-qty-hidden-'+sid);
    var deliveryProp=document.getElementById('mtc-delivery-prop-'+sid);
    var carriersDiv=document.getElementById('mtc-carriers-'+sid);
    var sumVariant=document.getElementById('mtc-sum-variant-'+sid);
    var sumPrice=document.getElementById('mtc-sum-price-'+sid);
    var sumDelivery=document.getElementById('mtc-sum-delivery-'+sid);
    var form=document.getElementById('mtc-form-'+sid);
    function fmt(cents){return (cents/100).toFixed(2).replace('.',',')+' EUR';}

    /* Chip selection */
    config.querySelectorAll('.mtc__chips').forEach(function(group){
      group.querySelectorAll('.mtc__chip').forEach(function(chip){
        chip.addEventListener('click',function(){
          group.querySelectorAll('.mtc__chip').forEach(function(c){c.classList.remove('mtc__chip--active')});
          this.classList.add('mtc__chip--active');
          updateVariant();
        });
      });
    });

    function getSelected(){
      var opts=[];
      config.querySelectorAll('.mtc__chips').forEach(function(g){
        var a=g.querySelector('.mtc__chip--active');
        opts.push(a?a.dataset.value:'');
      });
      return opts;
    }

    function updateVariant(){
      var sel=getSelected();
      var v=variants.find(function(v){return v.options.every(function(o,i){return o===sel[i]})});
      if(v){
        variantInput.value=v.id;
        priceEl.textContent=fmt(v.price);
        sumPrice.textContent=fmt(v.price);
        sumVariant.textContent=v.title;
        if(v.unit_price&&unitEl){unitEl.textContent='('+fmt(v.unit_price)+'/'+v.unit_price_measurement.reference_unit+')';}
        if(v.available){addBtn.disabled=false;addBtn.textContent=addBtn.dataset.text||'Jetzt bestellen';}
        else{addBtn.disabled=true;addBtn.textContent='Ausverkauft';}
        var img=document.getElementById('mtc-img-'+sid);
        if(v.featured_image&&img){img.src=v.featured_image.src.replace(/\.([^.]+)$/,'_800x.$1');}
      }
    }

    /* Step navigation */
    function goTo(step){
      config.querySelectorAll('.mtc__step').forEach(function(s){
        var n=parseInt(s.dataset.step);
        s.classList.remove('mtc__step--active');
        if(n<step)s.classList.add('mtc__step--done');
        else s.classList.remove('mtc__step--done');
        if(n===step)s.classList.add('mtc__step--active');
      });
    }
    config.querySelectorAll('.mtc__next-btn').forEach(function(b){
      b.addEventListener('click',function(){goTo(parseInt(this.dataset.next))});
    });
    config.querySelectorAll('.mtc__back-btn').forEach(function(b){
      b.addEventListener('click',function(){goTo(parseInt(this.dataset.back))});
    });
    config.querySelectorAll('.mtc__step-header').forEach(function(h){
      h.addEventListener('click',function(){
        var step=parseInt(this.closest('.mtc__step').dataset.step);
        goTo(step);
      });
    });

    /* Delivery method */
    config.querySelectorAll('.mtc__radio').forEach(function(r){
      r.addEventListener('change',function(){
        var val=this.value;
        if(val==='express'){carriersDiv.style.display='block';}
        else{carriersDiv.style.display='none';}
        var label=val==='self_pickup'?'Selbstabholung':'Express-Lieferung';
        sumDelivery.textContent=label;
        deliveryProp.value=label;
      });
    });

    /* Quantity */
    var minusBtn=config.querySelector('.mtc__qty-minus');
    var plusBtn=config.querySelector('.mtc__qty-plus');
    if(minusBtn)minusBtn.addEventListener('click',function(){qtyInput.value=Math.max(1,parseInt(qtyInput.value)-1);qtyHidden.value=qtyInput.value;});
    if(plusBtn)plusBtn.addEventListener('click',function(){qtyInput.value=parseInt(qtyInput.value)+1;qtyHidden.value=qtyInput.value;});
    if(qtyInput)qtyInput.addEventListener('change',function(){qtyHidden.value=this.value;});

    /* AJAX submit */
    addBtn.dataset.text=addBtn.textContent;
    form.addEventListener('submit',function(e){
      e.preventDefault();
      addBtn.disabled=true;addBtn.textContent='...';
      var body={id:parseInt(variantInput.value),quantity:parseInt(qtyHidden.value),properties:{}};
      body.properties['Lieferart']=deliveryProp.value;
      fetch('/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json()})
      .then(function(){
        addBtn.textContent='\u2713 Hinzugefuegt!';
        setTimeout(function(){addBtn.disabled=false;addBtn.textContent=addBtn.dataset.text},2500);
        fetch('/cart.js').then(function(r){return r.json()}).then(function(c){
          document.querySelectorAll('.cart-count-bubble span,[data-cart-count]').forEach(function(el){el.textContent=c.item_count});
        });
      })
      .catch(function(){addBtn.disabled=false;addBtn.textContent='Fehler - erneut versuchen'});
    });
  });
});
