var socket;
var initSocketServer = (teamId) => {
  socket = io('/', {query: teamId ? ('team=' + teamId) : undefined});
  socket.on('connect', function(){
  	console.log(1)
  });
  socket.on('event', function(data){
  	console.log(data)
  });
  socket.on('disconnect', function(){
  	console.log(0)
  });
}
