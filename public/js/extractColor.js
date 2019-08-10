var bodyStyles = window.getComputedStyle(document.body);
var cp = (prop) => bodyStyles.getPropertyValue(prop);
function hexToRgbA(hex,alpha=1){
  hex = hex.trim();
  var c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
    c= hex.substring(1).split('');
    if(c.length== 3){
      c= [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c= '0x'+c.join('');
    return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
  }
  throw new Error('Bad Hex');
}
const green = cp('--brightgreen').trim();
const red = cp('--lightred').trim();
const purple = cp('--textpurple').trim();
const orange = cp('--brightorange').trim();
const yellow = cp('--brightyellow').trim();
