"use strict"

var fisher 	= require('../index');


var log = console.log, interval;
if (typeof process.argv[1] !== undefined) {
	if (process.argv[2]) interval = parseInt(process.argv[2], 10);
	fisher.watch(process.argv[1], {interval: interval})
		.on('update', function (n) {
			var str = n.isFile() ? 'file' : ' dir';
			console.log('-------------------------------- update ' + str + ': ' + n.filepath)
		})
		.on('delete', function (n) {
			var str = n.isFile() ? 'file' : 'dir';
			console.log('-------------------------------- delete ' + str + ': ' + n.filepath)
		})
		.on('create', function (n) {
			var str = n.isFile() ? 'file' : 'dir';
			console.log('-------------------------------- create ' + str + ': ' + n.filepath)
		});
	process.exit(0);
}

log('')
log('	Usage: watch <path> [interval]')
log('')
log('	watch file or directory change accurately')
log('')
