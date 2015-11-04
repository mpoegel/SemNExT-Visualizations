/// <reference path="./../../../typings/tsd.d.ts"/>

var d3 = require('d3'),
	$  = require('jquery');

namespace campfire_wall {
	
	function d3selectAll(selector) { 
		return d3.selectAll(selector); 
	}

	function d3select(selector) { 
		return d3.select(selector); 
	}
	
	function $(selector) { 
		return $(selector); 
	}
	
}

export = campfire_wall