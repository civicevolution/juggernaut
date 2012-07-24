var http     = require("http");
var https    = require("https");
var util      = require("util");
var path     = require("path");
var fs       = require("fs");
var io       = require("socket.io");
var nstatic  = require("node-static-maccman");
var Connection = require("./connection");
var redis   = require("./redis");

_STATS = {
	last_report_time: new Date().getTime(),
	messages_sent: 0,
	last_messages_sent: 0
}
_AUTH = {};

var credentials;
var keysPath = __dirname + "/keys";
if (fs.existsSync(keysPath + "/privatekey.pem") && fs.existsSync(keysPath + "/certificate.pem")) {
  var privateKey = fs.readFileSync(keysPath + "/privatekey.pem", "utf8");
  var certificate = fs.readFileSync(keysPath + "/certificate.pem", "utf8");
  credentials = {key: privateKey, cert: certificate};
}

Server = module.exports = require("./klass").create();

var fileServer = new nstatic.Server(path.normalize(__dirname + "../../../public"));

Server.include({
  init: function(){
    var connectionListener = function(request, response){
      request.addListener("end", function() {

        fileServer.serve(request, response, function (err, res) {
          if (err) { // An error as occured
            util.error("> Error serving " + request.url + " - " + err.message);
            response.writeHead(err.status || 500, err.headers);
            response.end();
          } else { // The file was served successfully
            util.log("Serving " + request.url + " - " + res.message);
          }
        });

      });
    }

    if (credentials) {
      this.httpServer = https.createServer(credentials, connectionListener);
    } else {
      this.httpServer = http.createServer(connectionListener);
    }

    this.io = io.listen(this.httpServer);
    this.io.sockets.on("connection", function(stream){ Connection.inst(stream) });
		this.io.set('log level', 1);

		// create a redis client to be used in subscribe AUTH
		_AUTH._redis_client = redis.createClient();
		_AUTH._redis_client.on("error", function (err) {
			console.log("_AUTH._redis_client connection error to " + _AUTH._redis_client.host + ":" + _AUTH._redis_client.port + " - " + err);
		});
		_AUTH._redis_client.auth(null);

  },

  listen: function(port){
    port = parseInt(port || process.env.PORT || 8080);
    this.httpServer.listen(port);
  }
});