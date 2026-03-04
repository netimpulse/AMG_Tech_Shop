
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.mpc__track-wrap').forEach(function(wrap){
    var track=wrap.querySelector('.mpc__track');
    if(!track)return;
    var prev=wrap.querySelector('.mpc__arrow--prev');
    var next=wrap.querySelector('.mpc__arrow--next');
    var scrollAmt=track.querySelector('.mpc__slide')?.offsetWidth+20||280;
    if(prev)prev.addEventListener('click',function(){track.scrollBy({left:-scrollAmt,behavior:'smooth'})});
    if(next)next.addEventListener('click',function(){track.scrollBy({left:scrollAmt,behavior:'smooth'})});
    var autoplay=track.dataset.autoplay==='true';
    var speed=parseInt(track.dataset.speed)||4000;
    if(autoplay){
      var iv=setInterval(function(){
        if(track.scrollLeft+track.clientWidth>=track.scrollWidth-10){track.scrollTo({left:0,behavior:'smooth'})}
        else{track.scrollBy({left:scrollAmt,behavior:'smooth'})}
      },speed);
      track.addEventListener('mouseenter',function(){clearInterval(iv)});
      track.addEventListener('mouseleave',function(){
        iv=setInterval(function(){
          if(track.scrollLeft+track.clientWidth>=track.scrollWidth-10){track.scrollTo({left:0,behavior:'smooth'})}
          else{track.scrollBy({left:scrollAmt,behavior:'smooth'})}
        },speed);
      });
    }
  });
});
