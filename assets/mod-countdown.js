(function(){
document.querySelectorAll('[data-mcd-target]').forEach(function(el){
  var target=new Date(el.getAttribute('data-mcd-target')).getTime();
  var days=el.querySelector('[data-mcd-days]'),hours=el.querySelector('[data-mcd-hours]'),mins=el.querySelector('[data-mcd-mins]'),secs=el.querySelector('[data-mcd-secs]');
  function pad(n){return n<10?'0'+n:''+n}
  function tick(){
    var now=Date.now(),diff=Math.max(0,target-now);
    var d=Math.floor(diff/864e5),h=Math.floor(diff%864e5/36e5),m=Math.floor(diff%36e5/6e4),s=Math.floor(diff%6e4/1e3);
    if(days)days.textContent=pad(d);if(hours)hours.textContent=pad(h);if(mins)mins.textContent=pad(m);if(secs)secs.textContent=pad(s);
  }
  tick();setInterval(tick,1000);
});
})();
