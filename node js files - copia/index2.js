
var bodyParser  = require('body-parser');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var MongoClient = require('mongodb').MongoClient;
var userDAO     = require('./dao/UserDAO').UserDAO;

app.use(bodyParser.urlencoded({ extended: true }));

/* Mongodb config */
var mdbconf = {
  host: 'localhost',
  port: '27017',
  db: 'chatSS'
};

/* Get a mongodb connection and start application */
MongoClient.connect('mongodb://'+mdbconf.host+':'+mdbconf.port+'/'+mdbconf.db, function (err, db) {
  console.log('hello world');

  if (err) {
console.log('unable to conenecttt :' , err);
}
else {
  
  var usersDAO = new userDAO(db); // Initialize userDAO
  var onlineUsers = [];


/** *** *** ***
 *  Configuramos el sistema de ruteo para las peticiones web:
 */
  
app.get('/signup', function (req, res) {
    res.sendFile( __dirname + '/views/signup.html');
  });


app.post('/signup', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var email    = req.body.email;
	var grupoAutocodes = req.body.autocodesGroup;

usersDAO.addUser(username, password, email, grupoAutocodes, function (err, user) {
      if (err) {
        res.send({ 'error': true, 'err': err});
      }
      else {
		
	  user.password = null;
        res.send({ 'error': false, 'user': user });
      }
    });
});

app.post('/login', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
	var grupoAutocodes = req.body.autocodesGrupo;
    
    usersDAO.validateLogin(username, password, function (err, user) {
      if (err) {
        res.send({'error': true, 'err': err});
      }
      else {
        user.password = null;
        res.send({ 'error': false, 'user': user});
      }
    });
  });






/** css and js request */
  app.get('/css/foundation.min.css', function (req, res) {
    res.sendFile(__dirname + '/views/css/foundation.min.css');
  });

  app.get('/css/normalize.css', function (req, res) {
    res.sendFile(__dirname + '/views/css/normalize.css');
  });
  
  app.get('/js/foundation.min.js', function (req, res) {
    res.sendFile(__dirname + '/views/js/foundation.min.js');
  });
  /** *** *** */



app.get('/', function(req, res){
  res.sendFile(__dirname + '/views/index.html');
});

/** *** *** ***
   *  Configuramos Socket.IO para estar a la escucha de
   *  nuevas conexiones. 
   */
io.on('connection', function(socket){
	console.log('a user connected');
	socket.on('all online users', function () {
      		socket.emit('all online users', onlineUsers);
   	});
	socket.on('disconnect', function(){
		onlineUsers.splice(onlineUsers.indexOf(socket.user), 1);
		console.log('user disconnected');
		io.emit('remove user', socket.user);
	});
	socket.on('chat message', function(msg, grupoAutocodes, usuario){
		//io.emit('chat message', msg);
		console.log('Servidor: mensaje recibido: ' + msg + 'al grupo: ' + grupoAutocodes);
		
		var object = {username: usuario, message: msg};
		
		console.log('Servidor: mensaje enviado: el usuario ' + object.username + 'envia sms'+ object.message);
		var json =  JSON.stringify(object);
		
		io.to(grupoAutocodes).emit('chat message', object);
	});

	/**
     	* Cuando un cliente se conecta, emite este evento
     	* para informar al resto de usuarios que se ha conectado.
     	* @param  {[type]} nuser El nuevo usuarios
		
		por ahora el grupo se ingresa en el signup y no cambia. durante el chat se envia esto. una vez en android
		hay que buscar la forma de enviar el grupo  en el {chat message}. creo que esto habría que sacarlo.
     	*/
    	socket.on('new user', function (nuser) {
      	socket.user = nuser;
		console.log('el usuario siguiente se conecto: ' + nuser._id);
		console.log('el usuario siguiente se conecto: ' + socket.user._id);
		

		usersDAO.obtenerObjetoUsuario(nuser._id, function (err, user) {
		socket.room = user.grupoAutoc;
      	socket.join(user.grupoAutoc);
        console.log('el grupo a emitir logueo es: ' + user.grupoAutoc);
		io.to(user.grupoAutoc).emit('new user', nuser);
      
		});
	   	//onlineUsers.push(nuser);
      	//io.emit('new user', nuser);
		});
		
		socket.on('register room', function (usuario, grupoAuto){
		console.log('el usuario: ' + usuario + 'se registrara en el grupo: '+ grupoAuto);
		socket.room = grupoAuto;
		socket.join(grupoAuto);	
					
		});
		
		socket.on("change room",function(nuevoGrupo){
		socket.leave(socket.room);
		socket.join(nuevoGrupo);
		});
		/*
		socket.on('add user', function (user, group) {
		socket.user = user;
		console.log('El usuario siguiente ingreso: '+ user);
		socket.room = group;
      	socket.join(group);
		
    }); */
});




http.listen(3000, function(){
  console.log('listening on *:3000');
});


}

});

