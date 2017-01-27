import * as d3 from 'd3';
import * as $ from 'jquery';

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