var binker = {};
binker.start = function(){
	binker.content=document.body.innerHTML;
	console.log(binker.content);
}
$(document).ready(function(){
	binker.start();
});