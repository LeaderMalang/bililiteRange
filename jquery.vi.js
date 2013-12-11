// moving toward an implementation of vi for jQuery
// (http://pubs.opengroup.org/onlinepubs/9699919799/utilities/vi.html)

// depends: jquery.js, bililiteRange.js, bililiteRange.util.js, bililiteRange.ex.js, jquery.keymap.js

(function($){

$.fn.vi = function(statusbar){
	return this.each(function(){
		bililiteRange(this).exState().vimode = 'INSERT'; // unlike real vi, start in insert mode since that is more "natural" for a GUI
		$(this).trigger('vimode', 'INSERT');
		$.data(this, 'vi.statusbar', statusbar);
		addviCommands (this, vimodeCommands, '', 'vi~');
		addviCommands (this, insertmodeCommands, '!', 'insert~');
	}).on('vimode', function(evt, data){
		state.vimode = data;
	});
}

function executeCommand (rng, command){
	// returns a function that will run command (if not defined, then will run whatever command is passed in when executed)
	return function (text){
		return rng.bounds('selection').ex(command || text).select().scrollIntoView().exMessage;
	};
}

$.extend (bililiteRange.ex.commands, {
	map: function (parameter, variant){
		// The last word (either in a string or not containing spaces) is the replacement; the rest of
		// the string at the beginning are the mapped key(s)
		var rng = this, state = this.exState();
		var match = /^(.+?)([^"\s]+|"(?:[^"]|\\")+")$/.exec(parameter);
		if (!match) throw {message: 'Bad syntax in map: '+parameter};
		var keys = match[1].trim();
		var command = bililiteRange.ex.string(match[2]);
		$(rng.element()).on('keydown', {keys: keys}, function() {
			var mode = state.vimode;
			if (variant == (mode != 'INSERT')) return; // variant == true means run in insert mode
			$($.data(this, 'vi.statusbar')).statusbar({run: executeCommand(rng, command)});
			return false;
		});
	},
	select: function (parameter, variant){
		this.bounds(parameter).select();
	},
	sendkeys: function (parameter, variant){
		$(this.element()).sendkeys(parameter);
		this.bounds('selection');
	},
	vi: function (parameter, variant){
		parameter = parameter || 'VISUAL';
		this.exState().vimode = parameter;
		$(this.element()).trigger('vimode', parameter);
	}
});

var vimodeCommands = {
	':' : function (){
		var statusbar = $.data(this.element(), 'vi.statusbar');
		$(statusbar).statusbar({
			prompt: ':',
			run: executeCommand(this),
			result: $.Deferred().always(function() {this.element().focus()}), // make sure we return focus to the text!
		});
	},
	'{esc}' : "'.vi", // note that vi commands should use the magic '. marker to indicate not to change the selection
	a: "'.select endbounds | '.vi INSERT",
	h: "'.sendkeys {leftarrow}",
	i: "'.select startbounds | '.vi INSERT",
	l: "'.sendkeys {rightarrow}",
	o: "a | vi INSERT" 
},
insertmodeCommands = {
	'{esc}' :"'.vi"
}

function addviCommands(el, commands, variant, prefix){
	for (key in commands){
		if ($.isFunction (commands[key])){
			var id = prefix + bililiteRange.ex.toID(key);
			bililiteRange.ex.commands[id] = commands[key];
			commands[key] = "'." + id; // make sure we don't change the selection (that's the magic '. marker)
		}
		bililiteRange(el).ex('map'+variant+' '+key+' '+JSON.stringify(commands[key]));
	}
}

})(jQuery);