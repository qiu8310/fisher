# fisher

监听任意文件夹，如果某一文件有变化（update/delete/create），可以立即得到提醒。为什么叫 `fisher`，主要是这个程序就像垂钓者一样，需要时刻关注水面的情况。

##有了 watch，为什么还要做 fisher

它们两都的结果不太一样，原理也不一样！

1. 结果：我在用 watch 时，经常创建一个文件时，会触发多次 update 事件，也就是说它做的还不够精确，不符合我的要求；而且它在各个平台上的表现也不一致

2. 原理：watch 用的是 node 提供的原生的 watch 函数，而这个函数在各个平台上的表现是不一致的，尽管 watch 做了很多控制，让它表现的尽可能的在各个平台一致，但多少还是有一些瑕疵。 fisher 就不同，它不是运用 node 提供的原生 api，它其实更简单，它只是监控文件的 modify time 及 文件的大小和上一次比是否有变化，有的化就表示这个文件有了更新，添加和删除就更容易了，所以用 fisher 一般是不会出现不准确的情况的

##使用实例

	var fisher = require ('fisher');
	watcher = fisher.watch('path/to/a/dir')
		.on('update', function (node) {
			// update file
		})
		.on('delete', function (node) {
			// delete file
		})
		.on('create', function (node) {
			// create file
		});
