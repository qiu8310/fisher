"use strict";

var path 		= require('path'),
	fs 			= require('fs'),
	fisher 		= require('../index');

// same as linux command: rm -rf
var rm_rf = function (dir) {
	try {
		var files = fs.readdirSync(dir);
		for (var s, f, i=0,l=files.length; i<l; ++i) {
			f = path.join(dir, files[i]);

			try {
				s = fs.statSync(f);
				if (s.isDirectory()) {
					rm_rf(f);
				} else {
					fs.unlinkSync(f);
				}
			} catch(e){};
		}
		fs.rmdirSync(dir);
	} catch(e){}
}

// path.join
var p = function (a, b) { return path.join(a, b).replace(/\\/g, '/'); }

// create file
var f = function (a) { if(!Array.isArray(a)) a = [a]; for(var i=0,l=a.length; i<l; ++i) {fs.closeSync(fs.openSync(a[i], 'w'));} }


module.exports = {
	setUp: function (cb) {
		this.root = p(__dirname, 'temp');
		try {
			rm_rf(this.root);
			fs.unlinkSync(this.root);
		} catch (e) {}
		fs.mkdirSync(this.root);
		this.subdir = p(this.root, 'subdir');
		this.emptydir = p(this.root, 'emptydir');
		this.f1 = p(this.root, 'f1');
		this.f2 = p(this.root, 'f2');
		this.subf1 = p(this.subdir, 'subf1');
		this.subf2 = p(this.subdir, 'subf2');

		fs.mkdirSync(this.subdir);
		fs.mkdirSync(this.emptydir);
		f([this.f1, this.f2, this.subf1, this.subf2]);

		this.interval = 100;

		this.watcher = fisher.watch(this.root, {interval: this.interval});

		this.watcher
			.on('update', function (n) {
				console.log('~~~~~~~~ update: ' + n.filepath)
			})
			.on('delete', function (n) {
				console.log('-------- delete: ' + n.filepath)
			})
			.on('create', function (n) {
				console.log('++++++++ create: ' + n.filepath)
			});
		
		cb();
	},

	tearDown: function (cb) {
		this.watcher.emit('stop');
		try {
			rm_rf(this.root);
			fs.unlinkSync(this.root);
		} catch (e) {}
		cb();
	},

	testFile: function (test) {
		var self = this, file = p(self.root, 'testFile');

		self.watcher
		.once('create', function (node) {
			test.equal(node.filepath, file);
			fs.writeFileSync(file, new Date().toLocaleString());
		})
		.once('update', function (node) {
			test.equal(node.filepath, file);
			fs.unlinkSync(file);
		})
		.once('delete', function (node) {
			test.equal(node.filepath, file);
			test.done();
		});
		
		f(file);
	},

	testDeepFile: function (test) {
		var self = this, file = p(self.subdir, 'testFile');

		self.watcher
		.once('create', function (node) {
			test.equal(node.filepath, file);
			fs.writeFileSync(file, new Date().toLocaleString());
		})
		.once('update', function (node) {
			test.equal(node.filepath, file);
			fs.unlinkSync(file);
		})
		.once('delete', function (node) {
			test.equal(node.filepath, file);
			test.done();
		});
		
		f(file);
	},

	testDir: function (test) {
		var self = this, dir = p(self.root, 'testDir');

		self.watcher
		.once('create', function (node) {
			test.equal(node.filepath, dir);
			fs.rmdirSync(dir);
		})
		.once('delete', function (node) {
			test.equal(node.filepath, dir);

			self.watcher.once('delete', function (node) {
				test.equal(node.filepath, self.subdir);
				test.done();
			});
			rm_rf(self.subdir);
		});

		fs.mkdirSync(dir);
	},

	testRootIsDir: function (test) {
		var self = this;

		self.watcher
		.once('delete', function (node) {
			test.equal(node.filepath, self.root);
			fs.mkdirSync(self.root);
		})
		.once('create', function (node) {
			test.equal(node.filepath, self.root);
			fs.rmdirSync(self.root);
			test.done();
		});
		rm_rf(self.root);
	},

	testRootIsFile: function (test) {
		var self = this, time = 1;
		
		self.watcher
		.once('create', function (node) {
			test.equal(node.filepath, self.root);
			fs.unlinkSync(self.root);
		})
		.on('delete', function (node) {
			// delete the root dir
			if (time === 1) {
				test.ok(node.stats.isDirectory());
				f(self.root);

			// delete the root file
			} else if (time === 2) {
				test.ok(node.stats.isFile());
				test.done();
			}
			time++;
		});

		rm_rf(self.root);
	}
}
	
			
