/**
 *	@author 	zhongleiqiu@gmail.com
 *	@version 	0.1.0
 *	@date 		2013/9/7
 *
 */
"use strict";

var util 	= require('util'),
	fs 		= require('fs'),
	path 	= require('path'),
	events 	= require('events');

/**
 *	files tree node
 */
function TreeNode (filepath) {
	if (!filepath || typeof filepath !== 'string') throw new Error('Wrong arguments for TreeNode');

	this.filepath = path.resolve(process.cwd(), filepath).replace(/\\/g, '/');  // use linux sep
	this.nodeType = TreeNode.NODE_NO;
	try {
		this.stats = fs.statSync(this.filepath);  // if file not exist, this will throw an error
		this.children = [];
		this.parent = null;
		if (this.stats.isDirectory()) {
			var i, l, f, n, files = fs.readdirSync(this.filepath);
			this.nodeType = TreeNode.NODE_DIR;
			for (i=0,l=files.length; i<l; i++) {
				f = path.join(this.filepath, files[i]);
				n = new TreeNode(f);
				if (n.available()) {
					this.addChild(n);
				}
			}
		} else if (this.stats.isFile()) {
			this.nodeType = TreeNode.NODE_FILE;
		}
	} catch (e) {} // maybe no right to read this file or the file dosen't exist, juit ignore
}
TreeNode.NODE_NO   = 0;
TreeNode.NODE_FILE = 1;
TreeNode.NODE_DIR  = 2;

TreeNode.prototype = {
	available: function () {
		return this.nodeType !== TreeNode.NODE_NO;
	},

	addChild: function (n) {
		this.children.push(n);
		n.parent = this;
	},

	getChildren: function () {
		return this.children || [];
	},

	getChild: function (i) {
		var c = this.getChildren();
		return c[i]
	},

	getChildIndex: function (n) {
		var i, l, c = this.getChildren();
		for (i=0,l=c.length; i<l; ++i) {
			if (c[i].filepath === n.filepath) return i;
		}
		return -1;
	}
}

/**
 *	opts:
 * 		interval: 1500
 * 		events: create, delete, update
 * 		functions: stop(), start()
 *
 */
function Watcher (root, opts) {
	var self = this;
	events.EventEmitter.call(this);

	opts = opts || {};
	
	self.sid = 0;
	self.interval 	= opts.interval || 1500;

	self.tree = new TreeNode(root);
	self.root = self.tree.filepath;

	self.isPrevRunning = false;		// if prev walk is running

	var walk = function () {
		self.sid = setTimeout(walk, self.interval);

		if (!self.isPrevRunning) {
			self.isPrevRunning = true;
			
			if (self.newTree) {
				self.tree = self.newTree;	// update old tree
			}

			self.newTree = new TreeNode(self.root);
			// root may be deleted
			if (self.newTree.available() && !self.tree.available()) {
				self.emit('create', self.newTree, 'create');

			// or created
			} else if (!self.newTree.available() && self.tree.available()) {
				self.emit('delete', self.tree, 'delete');
			
			// traverse the two tree
			} else {
				self._traverse(self.tree, self.newTree);
			}

			self.isPrevRunning = false;
		}
	}

	self.sid = setTimeout(walk, self.interval);

	// listen to the stop/start event
	self.on('stop', function (cb) {
		if (self.sid) {
			clearTimeout(self.sid);
			self.sid = 0;
			if (typeof cb === 'function') {
				var check = function () {
					if (self.isPrevRunning) {
						setTimeout(check, self.interval);
					} else {
						cb();
					}
				};
				check();
			}
		}
	}).on('start', function (cb) {
		if (!self.sid) {
			if (typeof cb === 'function') cb();
			walk();
		}
	});
}

util.inherits(Watcher, events.EventEmitter);

Watcher.prototype._traverse = function (p, c) {
	var self = this;
	if (p.nodeType !== c.nodeType) {
		self.emit('delete', p, 'delete');
		self.emit('create', c, 'create');
	} else {
		if (p.nodeType === TreeNode.NODE_FILE) {
			// mtime's millisecond will always be 000, show just use mtime may not accuracy when file update in one second
			if (p.stats.mtime.getTime() !== c.stats.mtime.getTime() || p.stats.size !== c.stats.size) {
				self.emit('update', c, 'update');
			}
		} else if (p.nodeType === TreeNode.NODE_DIR) {
			p.getChildren().forEach(function(it) {
				var i = c.getChildIndex(it);
				if (i === -1) {
					self.emit('delete', it, 'delete');
				}
			})

			c.getChildren().forEach(function(it) {
				var i = p.getChildIndex(it);
				if (i >= 0) {
					self._traverse(p.getChild(i), it);
				} else {
					self.emit('create', it, 'create');
				}
			});
		}
	}
}

Watcher.prototype.stop = function (cb) {
	this.emit('stop', cb);
	return this;
}

Watcher.prototype.start = function (cb) {
	this.emit('start', cb);
	return this;
}

exports.watch = function (root, opts) {
	return new Watcher(root, opts);
}
