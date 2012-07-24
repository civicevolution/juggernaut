#!/usr/bin/env node
var argv = require("optimist").argv,
    util = require("util");

var help = [
    "usage: juggernaut [options] ",
    "",
    "Starts a juggernaut server using the specified command-line options",
    "",
    "options:",
    "  --port   PORT       Port that the proxy server should run on",
    "  --silent            Silence the log output",
    "  -h, --help          You're staring at it"
].join('\n');

if (argv.h || argv.help) {
  return util.puts(help);
}

if( require('fs').existsSync("/ce_development") ){
	if(argv.log){
		console.log('write juggernaut log to /ce_development/log/juggernaut.log' );
		var stdo = require('fs').createWriteStream('/ce_development/log/juggernaut.log', {flags: 'a'});
		process.stdout.write = (function(write) {
			return function(string, encoding, fd) {
				stdo.write(string);
			}
		})(process.stdout.write)
	}
	
	//console.log('write juggernaut process pid ' + process.pid);
	var fs = require('fs');
	fs.writeFile("/ce_development/log/juggernaut.pid", process.pid, function(err) {
	    if(err) {
	        console.log(err);
	    } else {
	        //console.log("The file was saved!");
	    }
	});
	
}

process.title = 'CE'; // doesn't work on OS X

Juggernaut = require("./index");
Juggernaut.listen(argv.port);