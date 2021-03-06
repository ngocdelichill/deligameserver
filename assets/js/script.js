const DELI = {
  parameterURL : ( n = '', a = document.URL ) => {
        var d=a?a.split("?")[1]:window.location.search.slice(1);a={};if(d){d=d.split("#")[0];d=d.split("&");for(var f=0;f<d.length;f++){var c=d[f].split("="),b=c[0];c="undefined"===typeof c[1]?!0:c[1];"string"===typeof c;if(b.match(/\[(\d+)?\]$/)){var e=b.replace(/\[(\d+)?\]/,"");a[e]||(a[e]=[]);b.match(/\[\d+\]$/)?(b=/\[(\d+)\]/.exec(b)[1],a[e][b]=c):a[e].push(c)}else a[b]?(a[b]&&"string"===typeof a[b]&&(a[b]=[a[b]]),a[b].push(c)):a[b]=c}}
        if(n=='')
            return a;
        return a[n];
    },
    timeSince : (date) => {

       var seconds = Math.floor((new Date() - date) / 1000);
     
       var interval = seconds / 31536000;
     
       if (interval > 1) {
         return Math.floor(interval) + " years ago";
       }
       interval = seconds / 2592000;
       if (interval > 1) {
         return Math.floor(interval) + " months ago";
       }
       interval = seconds / 86400;
       if (interval > 1) {
         return Math.floor(interval) + " days ago";
       }
       interval = seconds / 3600;
       if (interval > 1) {
         return Math.floor(interval) + " hours ago";
       }
       interval = seconds / 60;
       if (interval > 1) {
         return Math.floor(interval) + " minutes ago";
       }
       return Math.floor(seconds) + " seconds ago";
     }
 }

function imready(obj){
  obj.innerHTML = "Cancel"; 
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log(JSON.parse(this.responseText));
        }
    };
    let token = DELI.parameterURL("token");
		let roomId = DELI.parameterURL("room");
    
    xhttp.open("POST", `/plays/ready`, true);
    xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhttp.send(`token=${token}&roomId=${roomId}`);
}



const PLAYER = {
  chooseColor :  (obj) => {
    var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				console.log(this.responseText);
			}
		};
		xhttp.open("POST", `/plays/choose_color`, true);
		xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhttp.send(`color=${obj.value}`);
  }
}

socket.on(`chess_mankey_${DELI.parameterURL("room")}`,(res)=>{
	if(res.userId != _me._id){
		var pace = res.pace.split(",");
		var x1 = parseInt(pace[0]);
		var y1 = parseInt(pace[1]);
		var x2 = parseInt(pace[2]);
		var y2 = parseInt(pace[3]);
		play.DevPlay(x1,y1,x2,y2);		
		play.isPlay = true;
	}else{
		play.isPlay = false;
	}
	
 });
 socket.on(`chess_start_${DELI.parameterURL("room")}`,(res)=>{ 
	var ready = true;	
	if (ready){			
		com.get("chessRight").style.display = "none";
		com.get("moveInfo").style.display = "block";
		com.get("moveInfo").innerHTML="";
		play.depth = 3;
		play.init();		
		if(res.userId == _me._id){
			setTimeout(()=>{		
				play.isPlay = true;
			},3000);		
		}	
		
	}
 });