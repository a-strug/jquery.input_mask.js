(function($, undefined) {
	$.fn.inputMask = function(options) {
		return this.each(function() {
		var obj = $(this), masked = obj.data('masked');

			if (!masked) {
				options = $.extend({}, $.fn.inputMask.defaults, options);
				masked = obj.data(new InputMask(obj, options));
			}
		});
	};

	$.fn.inputMask.defaults = {
		regExp: {
			'd': "[0-9]",
			'w': "[A-Za-zа-яА-ЯіІєЄїЇёЁ]",
			'*': "[A-Za-zа-яА-ЯіІєЄїЇёЁ0-9]"
		}
	}

	String.prototype.setCharAt = function(index, chr) {
		if(index > this.length - 1) return str;
		return this.substr(0, index) + chr + this.substr(index + 1);
	}

	function InputMask(obj, options) {
		this.obj            = obj;
		this.options        = options;
		this.mask           = this.obj.data('mask') || options.mask;
		this.regExpFromMask = this.generateRegExp();
		this.editablePos    = [];
		this.strType        = this.regExpToArray();	
		this.placeholder    = this.obj.data('placeholder') || null;
		this.rusMoreLetters = [186, 188, 190, 191, 192, 219, 221, 222];
		this.preventCode    = [37, 39, 8, 46];
		this.masked         = true;
		this.obj.val(this.placeholder);
		this.parseMask();
		this.events();
	}

	var Proto = InputMask.prototype;
        
        Proto.regExpToArray = function(){
		var keys = [];
		$.each(this.options.regExp, function(key, val){ keys.push(key) });
		return keys;
        }
        
	Proto.events = function(){
		var self = this;

		this.obj.bind('keydown', function(e){
			if ($.inArray(e.keyCode, self.preventCode) != -1) {
				e.preventDefault();
			}	
			setTimeout(function(){
				self.bindKeyPress(e, self.charCode);
			}, 10);
		});

		this.obj.bind('keypress', function(e){
			// use e.keyCode for IE support
			self.charCode = e.charCode || e.keyCode;
			e.preventDefault();
		});

		this.obj.bind('blur', function(){
			if (self.obj.val().match(self.regExpFromMask)) return;
			self.obj.val(self.placeholder);
		});

		this.obj.bind('focus', function(){
			self.obj.val(self.mask);
			self.setCursorPosition(0);
		});
	}

	Proto.generateRegExp = function(){
		var re = /\{%(\w)(\d)(?=\})\}/gi, regExp;
		regExp = this.mask.replace(/\{(\w|\*)(\d)(?=\})\}/gi, this.replacer);
		regExp = regExp.replace(/([.*+?^$()])/g, "\\$1");
		return regExp;
	}

	Proto.replacer = function(str, p1, p2){
		return $.fn.inputMask.defaults.regExp[p1] + "{" + p2 + "}";
	}

	Proto.bindKeyPress = function(e, charCode){
		var key = e.which || e.keyCode,
		cur_pos = this.getCursorPosition(),
		mov_dir = 0,
		let_pos,
		move_cursor = false;

		if((key >= 10 && key < 32) || (key > 32 && key < 37) || (key > 40 && key < 45) || (key >= 112 && key <= 145) ) {
			return;
		} else if (key == 37 || key == 39) {
			cur_pos = (key == 37 ? cur_pos - 1 : cur_pos + 1);
			this.setCursorPosition(cur_pos);
		}

		mov_dir = (key == 8) ? -1 : 1;

		if(mov_dir == 1 && cur_pos > this.mask.length) {
			return;
		}

		while(this.editablePos[(mov_dir == 1 ? cur_pos : cur_pos - 1)] == '-') {
			cur_pos += mov_dir;	    	
		}

		let_pos = (mov_dir == 1) ? cur_pos : cur_pos - 1;

		if (this.editablePos[let_pos] != '-'){
			if(key == 8 && let_pos >= 0) {
				charCode = 95;
				move_cursor = true;
			}

			if (this.editablePos[let_pos] == 'd') {
				if ((key >= 48 && key <= 57) || (key >= 96 && key <= 105)) {
					move_cursor = true;
				}	    		
			} else if (this.editablePos[let_pos] == 'w') {
				if ((key >= 65 && key <= 89) || ($.inArray(key, this.rusMoreLetters) != -1)) {
					move_cursor = true;
				}
			} else if (this.editablePos[let_pos] == '*') {
				if ((key >= 65 && key <= 89) || ($.inArray(key, this.rusMoreLetters) != -1) || ((key >= 48 && key <= 57) || (key >= 96 && key <= 105))) {
					move_cursor = true;
				}	  		
			}
		}

		if (move_cursor === true) {
			this.mask = this.mask.setCharAt(let_pos, String.fromCharCode(charCode));
			this.obj.val(this.mask);
			this.setCursorPosition(cur_pos + mov_dir);
		}	
	}

	Proto.parseMask = function(){
		var re = /\{(.*?)(?=\})\}/gi,
		str_replace = [],
		sub_length  = 0,
		sub_type    = 'w';

		if (matches = this.mask.match(re)) {
			var len = matches.length;
			for (var i=0; i < len; i++) {
				sub_length = parseInt(matches[i].substring(2, 3));
				sub_length = parseInt((sub_length == 0 ? 1 : sub_length));
				sub_type = matches[i].substring(1, 2);

				while(sub_length--) { 
					str_replace.push(sub_type); 
				}

				this.mask = this.mask.replace(matches[i], str_replace.join(''));
				str_replace = []
			}

			this.editablePos = Array((this.mask.length + 1)).join("-").split('');
			var mask_arr = this.mask.split(''), mask = [], let, len = mask_arr.length;

			for(var i=0; i < len; i++) {
				let = mask_arr[i];

				if($.inArray(mask_arr[i], this.strType) != -1) {
					let = '_';
					this.editablePos[i] = mask_arr[i];
				}

				mask.push(let);
			}		

			this.mask = mask.join('');
		}
	}

	Proto.getCursorPosition = function(){
		var pos = 0, el = this.obj.get(0), sel, selLen;

		// IE Support
		if (document.selection) {
			el.focus();
			sel = document.selection.createRange();
			selLen = document.selection.createRange().text.length;
			sel.moveStart('character', -el.value.length);
			pos = sel.text.length - selLen;
		} else if (el.selectionStart || el.selectionStart == '0') {
			pos = el.selectionStart;
		}

		return pos;		
	}

	Proto.setCursorPosition = function(pos) {
		if(this.obj.length == 0) return this.obj;
		return this.setSelection(pos, pos);
	};

	Proto.setSelection = function(start, end){
		var el = this.obj.get(0), range;

		if (el.setSelectionRange) {
			el.focus();
			el.setSelectionRange(start, end);
		} else if (el.createTextRange) {
			range = el.createTextRange();
			range.collapse(true);
			range.moveEnd('character', end);
			range.moveStart('character', start);
			range.select();
		}	
	}
})(jQuery)