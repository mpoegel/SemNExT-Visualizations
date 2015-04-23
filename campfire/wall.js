// node webkit gui/window stuff
var gui = require('nw.gui'); 
var nodewin = gui.Window.get();

/* bind console shortcut for this node webkit window.
we want this way up top so even if there are errors in other parts
of the code, we can still (hopefully) get to the console. I'm not 
using the Shortcut() method here because I don't want this to be
a desktop shortcut. I want the window to need focus.
*/
document.body.onkeydown=function keyfunc(e){
    if (e.keyCode == 123){ //F12
    	nodewin.showDevTools();
    }
}

/* bind fullscreen to a global shortcut, so the window doesn't 
need focus to enter or exit fullscreen
*/
var fullscreen_shortcut = new gui.Shortcut({
    key : "F2",
    active : function(){ nodewin.toggleFullscreen(); },
    failed : function(msg) { console.log(msg); }
});
gui.App.registerGlobalHotKey(fullscreen_shortcut);


var margin = window.opener.margin,
		clusterToStage = window.opener.clusterToStage,
		data_files = window.opener.data_files;


		
/* update the heatmap on the wall
arguments: heatmap_data - data to build the heatmap from
					 gene_widths - list of the widths to make each column

returns: nothing
*/
function updateWall(heatmap_data, gene_widths) {
	// get a blank slate to work with
	$("#wall").empty();
	// define the width and height of the heatmap
	// campfire wall dimensions are 6400x800
	var	width = 6400 - margin.left - margin.right,
			height = 800 - margin.top - margin.bottom;
	// scale the gene widths according the overall width
	var sum = d3.sum(gene_widths);
	var factor = width/sum,
			run_sum = 0;
	// create the x-direction scale (not using d3 scale)
	var x = gene_widths.map(function(d) {
			run_sum += d*factor;
			return {
				x: run_sum - d*factor, // pardon the inefficiencies
				w: d*factor
			}
		});
	// create a y scale and a color scale to fill the individual boxes of
	// the heatmap
	var y = d3.scale.ordinal()
				.rangeRoundBands([height, 0]),
			colorScale = d3.scale.linear()
					.range(["#232323", "green", "red"]);
	// initialize an svg object in the appropriate container, set the dimensions
	// and create the margins
	var chart = d3.select("#wall").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.attr("background", "#000")
			.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.right + ")");
	// since there are 9 days for each datum point, the box heights are defined
	// as follows
	var box_height = height / 9;
	// map the domain of the y scale to the day numbers
	y.domain(heatmap_data.map(function(d) { return d.Day; }));
	// make the colorScale domain to be the mean +/- 2*sigma
	// this does a good job of eliminating the outliers and preventing red or
	// green to be over-dominant
	var mu = d3.mean(heatmap_data, function(d) { return d.Value; }),
			sd = 0;
	heatmap_data.forEach(function(d) { sd += Math.pow(d.Value - mu,2); });
	sd = Math.sqrt(sd / heatmap_data.length);
	var colorScale_min   = mu - 2 * sd,
			colorScale_max   = mu + 2 * sd,
			colorScale_pivot = mu;
	colorScale.domain([colorScale_min, colorScale_pivot, colorScale_max]);
	// each datum points represents one tile
	chart.selectAll(".tile")
				.data(heatmap_data)
			.enter().append("rect")
				.attr("class", "tile")
				.attr("gene", function(d) { return d.Gene_Symbol; })
				.attr("cluster", function(d) { return d.Cluster; })
				.attr("x", function(d,i) { return x[i/9 >> 0].x; })
				.attr("y", function(d) { return y(d.Day); })
				.attr("width", function(d,i) { return x[i/9 >> 0].w; })
				.attr("height", box_height)
				.style("fill", function(d) { return colorScale(d.Value); })
				.on("mouseover", function(d) {
					fade(d.Gene_Symbol);
					window.opener.fade(d.Gene_Symbol);
				})
}

/* fade all elements not related to a specific gene on the wall
arguments: gene	- name of a gene to highlight

returns: nothing
*/
function fade(gene) {
	// reset everything to 100% opacity
	fadeReset();
	// hide everything not connected to the current selection
	if (gene) {
		d3.selectAll(".chart .tile:not([gene='" + gene + "'])")
			.transition()
				.style("opacity", 0.50);
	}
}

/* fade all elements not in a specific cluster
arguments: cluster - cluster number to highlight

returns: nothing
*/
function fadeCluster(cluster) {
	// reset everything to 100% opacity
	fadeReset();
	// hide everything not in the selected cluster
	if (cluster) {
		d3.selectAll(".chart .tile:not([cluster='" + cluster + "'])")
			.transition()
				.style("opacity", 0.50);
	}
}

/* reset all elements to 100% opacity
arguments: none

returns: nothing
*/
function fadeReset() {
	// reset everything to 100% opacity
	d3.selectAll(".chart .tile")
		.transition()
			.style("opacity", 1.0);
}
