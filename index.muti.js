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
	this.children = [];
	this.parent = null;

	if (!filepath || typeof filepath !== 'string') throw new Error('Wrong arguments for TreeNode');

	this.filepath = path.resolve(process.cwd(), filepath).replace(/\\/g, '/');  // use linux sep
	this.nodeType = TreeNode.NODE_NO;
	try {
		this.stats = fs.statSync(this.filepath);  // if file not exist, this will throw an error
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

TreeNode.NODE_NO   		= 0;
TreeNode.NODE_FILE 		= 1;
TreeNode.NODE_DIR  		= 2;

TreeNode.prototype = {
	available: function () {
		return this.nodeType !== TreeNode.NODE_NO;
	},

	addChild: function (child) {
		this.children.push(child);
		child.parent = this;
	},

	getChildren: function () {
		return this.children || [];
	},

	getChild: function (i) {
		var c = this.getChildren();
		return c[i]
	},

	getChildIndex: function (child) {
		var i, l, c = this.getChildren();
		for (i=0,l=c.length; i<l; ++i) {
			if (c[i].filepath === child.filepath) return i;
		}
		return -1;
	}
}


var DATA = {},
	fisher;

/**
 *	opts:
 * 		interval: 1500
 * 		events: create, delete, update
 *
 */
function Fisher () {
	var self = this;
	events.EventEmitter.call(this);
	
	self.sid = 0;

	self.isPrevRunning = false;		// if prev walk is running

	var walk = function () {
		self.sid = setTimeout(walk, self.interval);

		if (!self.isPrevRunning) {
			self.isPrevRunning = true;

			var p, opts, node, newNode, time = +new Date;
			for (p in DATA) {
				opts = DATA[p]['opts'];
				node = DATA[p]['node'];

				if (opts.status === 'running' && time - opts.lastRunTime >= opts.interval) {
					newNode = new TreeNode(node.filepath);

					// root may be deleted
					if (newNode.available() && !node.available()) {
						self.emit('create', newNode, 'create');

					// or created
					} else if (!newNode.available() && node.available()) {
						self.emit('delete', node, 'delete');
					
					// traverse the two tree
					} else {
						self._traverse(node, newNode);
					}

					DATA[p]['node'] = newNode;
					DATA[p]['opts']['lastRunTime'] = time;
				}
			}

			self.isPrevRunning = false;
		}
	}

	self.sid = setTimeout(walk, self.interval);
}

util.inherits(Fisher, events.EventEmitter);

Fisher.prototype._traverse = function (p, c) {
	var self = this;
	if (p.nodeType !== c.nodeType) {
		self.emit('delete', p, 'delete');
		self.emit('create', c, 'create');
	} else {
		if (p.nodeType === TreeNode.NODE_FILE) {
			// mtime's millisecond will always be 000, so just use mtime may not accuracy when file update in one second
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


exports.watch = function (root, opts) {
	var p, 
		watched = false,
		opts = opts || {};
	opts.lastRunTime 	= 0;
	opts.status 		= 'running';
	opts.interval 		= opts.interval || 1500;

	// format the root path
	root = path.resolve(process.cwd(), root).replace(/\\/g, '/');

	for (p in DATA) {
		// equal, just update the opts
		if (p === root) {
			DATA[p]['opts'] = opts;
			watched = true;
			break;

		// root contain path, delete old and add new 
		} else if (p.indexOf(root) === 0) {
			DATA[p] = null;
			delete DATA[p];
			DATA[root] = {
				opts: opts,
				node: new TreeNode(root)
			};
			watched = true;
			break;
		
		// path contain root, do nothing
		} else if (root.indexOf(p) === 0) {
			watched = true;
			break;
		}
	}

	if (!watched) {
		DATA[root] = {
			opts: opts,
			node: new TreeNode(root)
		};
	}

	if (!fisher) {
		fisher = new Fisher();
	}

	return fisher;
}