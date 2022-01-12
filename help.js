var pkg = require('./package');
require('./')();

(function(){
	// shortcut
	var col = console.col;

	// title
	console
		.spacer()
		._(pkg.name, col('─ v'+pkg.version, 'grey'))
		._('---')
		._(col(pkg.repository.url, 'grey'))
		.spacer();

	// desc
	console
		._('Description', 'bold')
		._('---')
		._(pkg.description)
		.spacer();

	// install
	console
		._('Installation', 'white')
		.title('npm install --save console2')
		.spacer();

	// reference
	var ref = console
		._('Reference', 'white')
		._('Open README.md for complete reference')
		._()
		.box();

	ref.over();

	// reference
	var lineArgs = '['+col('line', 'white')+'], ['+console.col('option', 'white')+']';
	var docs = {
		beep: ['Beep noise, outputs "BEEP"', '['+console.col('title', 'white')+']'],
		box: ['Create a sub box', lineArgs],
		build: 'Returns current stack as Promise(string)',
		col: ['Colorize a string', col('input', 'white')+', {…'+col('color', 'white')+'}'],
		dir: '~log',
		error: ['Displays text in '+col('red','red'), lineArgs],
		flush: '~out',
		getParent: ['Return a specific parent box', '['+col('generations', 'white')+'=1]'],
		help: 'Display these information',
		info: ['Displays text in '+col('green','green'), lineArgs],
		line: ['Add a new line', lineArgs],
		log: ['Alias for .line AND .out', lineArgs],
		options: ['Set option/s', col('object', 'white')],
		out: ['Print current stack', lineArgs],
		over: ['Mark box printable for out()', lineArgs],
		pad: ['Pad a string', col('string', 'white')+', '+col('length', 'white')+', ['+col('string', 'white')+']'],
		spacer: 'Add empty line',
		strip: ['Remove colors from a string', col('string', 'white')],
		time: ['Display timer', '['+col('timerName', 'white')+'], ['+col('reset', 'white')+']'],
		timeEnd: '~time',
		title: ['Display text inside a box', lineArgs],
		trace: ['Beautified console.trace', '['+col('message')+']'],
		warn: ['Displays text in '+col('yellow','yellow'), lineArgs]
	};

	// insert docs
	Object.keys(console).sort().forEach(function(key){
		if(key.substr(0,1) === '_'
			|| ['Console','assert','overrideConsole'].indexOf(key) > -1
			|| typeof console[key] !== 'function') return;
		var doc = docs[key];
		var line = col(key, 'cyan')
			+ '('+(Array.isArray(doc) ? doc[1] : '')+')';

		if(!doc) return;

		// alias
		if(typeof doc === 'string' && doc.substr(0,1) === '~')
			doc = 'Alias for '+doc.substr(1);

		// add desc
		line += console.pad(' ', 35 - console.strip(line).length)
		+ ' - '
		+ (Array.isArray(doc) ? doc[0] : doc||'');

		ref._(line);
	});

	/**
	 * Example 1
	 */
	var example1 = function(){
		console.line('New Line');

		var red = console.box('Red Box Title', 'red');
		red.line('Red Box Line').over();

		var yellow = red
			.box('Yellow Box Title', {over:true,color:'yellow',colorText:'yellow',border:2})
			.line('Yellow Box Line');
		var green = yellow.box({color:'green'}).over().line('Hello World');

		red.line('Red Box Bottom');
	};

	// example
	console.spacer().title('Example 1: Box tree', 'bold');
	console.line(example1).line();

	example1();

	/**
	 * Example 2
	 */
	var example2 = function(){
		console.line({user:'RienNeVaPlus',id:123,attr:{items:2432,top:[1,2],note:null},online:true});
	};

	// example
	console.spacer().title('Example 2: Object inspection', 'bold');
	console.line(example2).line();

	example2();

	/**
	 * Example 3
	 */
	var example3 = function(){
		console.time('CustomTimer');    // create new timer
		console.time();                 // global timer
		console.time('CustomTimer');    // output created timer
	};

	// example
	console.spacer().title('Example 3: Stopwatch', 'bold');
	console.line(example3).line();

	example3();

	/**
	 * Example 4
	 */
	var example4 = function(){
		console.trace();
	};

	// example
	console.spacer().title('Example 4: Stack trace', 'bold');
	console.line(example4).line();

	example4();

	console.spacer().title(console.col('Have fun!', 'rainbow'));
	console.out();
})();