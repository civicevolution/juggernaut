var util     = require("util");
var Channel = require("./channel");
var Events  = require("./events");
var os = require('os');

Client = module.exports = require("./klass").create();

Client.include({
  init: function(conn){
    this.connection = conn;
    this.session_id = this.connection.session_id;
  },
  
  setMeta: function(value){
    this.meta = value;
  },
  
  event: function(data){
    Events.custom(this, data);
  },
  
  subscribe: function(message){
		var channel_name = message.getChannel();
    var channel = Channel.find(channel_name);
	
		//util.log("Check if session_id: " + message.ape_code.ror_session_id + " can subscribe to channel: " + channel_name );
		
		var client = this;
		_AUTH._redis_client.sismember( channel_name, message.ape_code.ror_session_id, 
			function(e,c){authorize_subscribe(e,c)} 
		);

		function authorize_subscribe(err,isMember){
			if(isMember){
				util.log("[authorize_subscribe] Subscribe session_id: " + message.ape_code.ror_session_id + " to channel: " + channel_name);
				channel.subscribe(client);
				client._ror_session_id = message.ape_code.ror_session_id;
			}else{
				util.log("Do not subscribe session_id: " + message.ape_code.ror_session_id + " to channel: " + channel_name);
			}
		}
  },
  
  unsubscribe: function(name){
    util.log("Client unsubscribing from: " + name);

    var channel = Channel.find(name);
    channel.unsubscribe(this);
  },

  publish: function(channel_name,data){
		//util.log("Check if session_id: " + data.ror_session_id + " can subscribe to channel: " + channel_name );
		
		var client = this;
		_AUTH._redis_client.sismember( channel_name, client._ror_session_id, 
			function(e,c){authorize_publish(e,c)} 
		);
		
		function authorize_publish(err,isMember){
			//util.log('callback from _AUTH._redis_client.sismember to authorize_publish');
			if(isMember){
				var msg = {
		  	  "channels": [channel_name],
		  	  "data": data,
		  	  "only": data.only
		  	};
		  	_AUTH._redis_client.publish("juggernaut", JSON.stringify(msg) );
				//util.log("[authorize_publish] Publish to channel: " + channel_name + " with session_id: " + data.ror_session_id );
			}else{
				util.log("Do not publish to channel: " + channel_name + " with session_id: " + data.ror_session_id );
			}
		}
  },

	stats: function(channel, data){
		//console.log("Send juggernaut stats back to the requesting socket");
		
		var channel_clients = [];
		Channel.find(channel).clients.forEach( 
			function(client,ind,ary){ 
				//console.log("name " + client.name );
				channel_clients.push( { 
					"name" : client.name, 
					"session_id" : client.session_id
				});
			}
		);

		var curTime = new Date().getTime();
		var interval = (curTime - _STATS.last_report_time)/1000;
		_STATS.last_report_time = curTime;
		
		var curMessages = _STATS.messages_sent;
		var messages_in_interval = curMessages - _STATS.last_messages_sent;
		_STATS.last_messages_sent = curMessages;
		
		var message = {
			"channel": channel,
			"data": {
				"act": "juggernaut stats",
				"clients": channel_clients,
				"namespace_conns" : Object.keys( this.connection.stream.namespace.sockets ).length,
				"messages_sent" : _STATS.messages_sent,
				"messages_per_sec" : messages_in_interval / interval,
				"pid": process.pid,
				"memoryUsage": process.memoryUsage(),
				"load_avg" : os.loadavg(), 
				"uptime": process.uptime(),
				"time_sent" : data.time_sent
			}
		}
		
		this.connection.client.write(JSON.stringify( message ) );
	},
	 
  write: function(message){
    if (message.except) {
      var except = Array.makeArray(message.except);
      if (except.include(this.session_id))
        return false;
    }
    ++_STATS.messages_sent
    this.connection.write(message);
  },
  
  disconnect: function(){
    // Unsubscribe from all channels
    Channel.unsubscribe(this);
  }
});