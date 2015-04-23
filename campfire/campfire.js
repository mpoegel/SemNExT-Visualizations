/* =============================================================================

Matthew Poegel
March 27, 2015

Creates a layout appropriate for the campfire by creating two seperate views:
one for the wall (heatmap) and another for the floor (chord diagram).

============================================================================= */

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
    key : "F1",
    active : function(){ nodewin.toggleFullscreen(); },
    failed : function(msg) { console.log(msg); }
});
gui.App.registerGlobalHotKey(fullscreen_shortcut);


/*
global config
*/
var margin = {top: 0, right: 0, bottom: 0, left: 0},
	// convert cluster number to cluster name
		clusterToStage = ['Pluripotency', 'Ectoderm', 'Neural Differentiation',
			'Cortical Specification', 'Early Layers', 'Upper Layers'],
		active_dataset = 1,
		data_files = [
			{ name: "Alzheimer's",
				file: 'alzheimer_chord_data.csv',
				domc: 6
			},
			{
				name: 'Autism',
				file: 'autism_chord_data.csv',
				domc: 6
			},
			{
				name: 'Holoprecencephaly',
				file: 'holoprecencephaly_chord_data.csv',
				domc: 3
			},
			{
				name: 'Lissencephaly',
				file: 'lissencephaly_chord_data.csv',
				domc: 6
			},
			{
				name: 'Microcephaly',
				file: 'microcephaly_chord_data.csv',
				domc: 2
			},
			{
				name: 'Tauopathy',
				file: 'tauopathy_chord_data.csv',
				domc: 6
			},
			{
				name: 'Symmetrical',
				file: 'WBSsymmetrical_chord_data.csv',
				domc: 1
			},
			{
				name: 'Highly Linear',
				file: 'WBShighlyLinear_chord_data.csv',
				domc: 1
			}
		];


// initialize charts on page load
$(document).ready(function() {

	// asynchronously wait for the wallHandle object to be created, then draw
	// the default graph
	setTimeout(function() {
		while(!wallHandle);
		updateGraphs(active_dataset);
	}, 0);

	// add the list of data sets to the data selection menu
	for (var i = 0; i < data_files.length; i++) {
		$("<li>")
			.addClass("list-group-item")
			.attr("data-number", i)
			.append(
				$("<h4>")
					.addClass("list-group-item-heading")
					.text(data_files[i].name)
			).append(
				$("<p>")
					.addClass("list-group-item-text")
					.text("Dominant Cluster: " + clusterToStage[data_files[i].domc-1])
			).appendTo( $("#data-selector ul") );
	}
});

// bind a custom popup menu to right click
$(".chart").bind("contextmenu", function(e) {
	e.preventDefault();
	$(".menu").finish().show(100).css({
		top: e.pageY + "px",
		left: e.pageX + "px"
	});
}).bind("click", function(e) {
	$(".menu").hide();
	$(".data-menu").hide();
});

// bind event listener to the menu buttons
$(".menu li").click(function() {
	switch($(this).attr("data-action")) {
		case "reset":
			fadeReset();
			wallHandle.fadeReset();
			break;
		case "highlight-domc":
			break;
		case "show-legend":
			break;
		case "select-data":
			selectData();
			break;
		default: break;
	}
	$(".menu").hide();
});


/* update the graph with the currently active dataset
arguments: d - dataset number

returns: nothing
*/
function updateGraphs(d) {
	mungeData(data_files[+d].file).then(function(data) {
		var group_lengths = updateFloor(data.chord_matrix, data.clusters,
			data.gene_symbols);
		wallHandle.updateWall(data.heatmap, group_lengths);
	});
}

/* munge the specified disease data for the heatmap and chord diagram
arguments: file_name - name of the file to munge

returns:   a promise of an object containing the chord data matrix,
						heatmap data, index-to-cluster array, and index-to-gene_symbol array
*/
function mungeData(file_name) {
	return new Promise(function(resolve, reject) {
		// load the data from the csv file asynchronously
		d3.csv("../chord_data/" + file_name, function(error, data) {
			// extract the labels from the input data
			var gene_symbols = [];
			for (var gene in data['0']) gene_symbols.push(gene);

			var	matrix = [], 						// square matrix of gene connections
					row = [],								// vector used to construct the matrix
					count = 0,							// track the index of each gene
					day_re = /[d]\d{1,2}/,  // regular expression to find heatmap data
					heatmap = [],						// heatmap data
					clusters = [];					// convert from index to cluster number

			data.forEach(function(d) {
				row = [];
				// get the data for the cluster and the connection matrix
				for (var gene in d) {
					// ignore empty lines
					if (d[gene] == "") {
						continue;
					}
					// if the data contains cluster information...
					else if (gene == "Cluster") {
						clusters.push(+d[gene]);
					}
					// if the data contains heatmap data as determined by the regex
					else if (day_re.exec(gene)) {
						heatmap.push({
							Gene_Symbol: gene_symbols[count],
							Day: gene,
							Value: +d[gene],
							Cluster: clusters[count],
							Index: count
						})
					}
					// otherwise data is a gene connections
					else {
						d[gene] = +d[gene];
						row.push(d[gene]);
					}
				}
				matrix.push(row);
				count++;
			});
			resolve({
				chord_matrix: matrix,
				heatmap: heatmap,
				clusters: clusters,
				gene_symbols: gene_symbols
			});
		})
	});
}

/* update the chord diagram on the wall
arguments: chord_data - data to build the chord diagram from
					 clusters   - index-to-cluster-number data
					 labels			- index-to-gene-symbol data

returns: list of the chord group lengths
*/
function updateFloor(chord_matrix, clusters, labels) {
	// start with a blank slate
	$("#floor").empty();
	// size configurations
	// campfire floor dimensions are 1050x1050 (circle)
	var	width = 1050 - margin.right - margin.left,
			height = 1050 - margin.top - margin.bottom,
			innerRadius = Math.min(width, height) * .45,
			// outerRadius = innerRadius * 1.07,
			outerRadius = Math.min(width, height) * .48;
			cluster_band_width = 20,
			chord_padding = 0.02;
	// create a color scale for the clusters
	var fill = d3.scale.category10();
	// initialize a chord object
	var chord = d3.layout.chord()
		.padding(chord_padding)
		.sortSubgroups(d3.descending);
	// initialize an arc object
	var arc = d3.svg.arc()
		.innerRadius(innerRadius)
		.outerRadius(outerRadius);
	// intialize another blank arc
	var blank_arc = d3.svg.arc();
	// create the chords from the data
	chord.matrix(chord_matrix);
	// initialize an svg object in the appropriate container, set the dimensions
	// and create the margins
	var chart = d3.select("#floor").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
			.append("g")
				.attr("transform", "translate(" + (width/2 + margin.left)
					+ "," + (height/2 + margin.right) + ")");
	// initialize the groups and attach additional data to use later
	var g = chart.selectAll("g.group")
			.data(chord.groups)
		.enter().append("svg:g")
			.attr("class", "group")
			.each(function(d,i) {
				d.angle = (d.startAngle + d.endAngle) / 2;
				d.cluster = clusters[i];
				d.gene = labels[i];
			});
	// create the arc corresponding to each gene
	g.append("svg:path")
			.style("stroke", function(d) { return fill(clusters[d.index]); })
			.style("fill", function(d) { return fill(clusters[d.index]); })
			.attr("d", arc)
			.on("mouseover", function(d) {
				fade(d.gene);
				wallHandle.fade(d.gene);
			});
	// calculate the start and end angle for each cluster band
	var cluster_bands = [],
			band = {},
			genes = [];
	clusters.map(function(d,i) {
		// new cluster is begining so add the old one
		if (i != 0 && d != clusters[i-1]) {
			genes.push(labels[i]);
			band.genes = genes;
			band.endAngle = (i == clusters.length-1 ? chord.groups()[i].endAngle : chord.groups()[i-1].endAngle);
			if (!band.startAngle) { band.startAngle = 0; band.cluster = 1; }
			cluster_bands.push(band);
			band = {};
			genes = [];
			band.cluster = d;
			band.startAngle = chord.groups()[i].startAngle;
		}
		// track the genes that are in this cluster band
		genes.push(labels[i]);
	});
	// add the final cluster band
	genes.push(labels[clusters.length-1]);
	band.genes = genes;
	band.endAngle = chord.groups()[clusters.length-1].endAngle;
	cluster_bands.push(band);
	// draw the cluster arcs using the data collected above
	chart.selectAll(".cluster_arc")
			.data(cluster_bands)
		.enter().append("path")
			.attr("d", blank_arc
				.innerRadius(outerRadius)
				.outerRadius(outerRadius + cluster_band_width)
				.startAngle(function(d) { return d.startAngle - chord_padding/2; })
				.endAngle(function(d) { return d.endAngle + chord_padding/2; })
			)
			.attr("class", "cluster_arc")
			.attr("fill", function(d) { return fill(d.cluster); })
			.on("mouseover", function(d) {
				fadeCluster(d.cluster);
				wallHandle.fadeCluster(d.cluster);
			})
	// draw the chords
	chart.selectAll("path.chord")
			.data(chord.chords)
		.enter().append("svg:path")
			.attr("class", "chord")
			.attr("gene", function(d) { return labels[d.source.index]; })
			.attr("cluster", function(d) { return clusters[d.source.index]; })
			.style("stroke", function(d) { return d3.rgb(fill(clusters[d.source.index])).darker(); })
			.style("fill", function(d) { return fill(clusters[d.source.index]); })
			.attr("d", d3.svg.chord().radius(innerRadius));

	// make a list of each group's length and add the additional padding
	var group_lengths = [],
			s = 0;
	for (var i in chord.groups()) {
		s = outerRadius *
			(chord.groups()[i].endAngle - chord.groups()[i].startAngle + chord_padding);
		group_lengths.push(s);
	}
	return group_lengths;
}

/* fade all elements not related to a specific gene on the floor
arguments: gene	- name of a gene to highlight

returns: nothing
*/
function fade(gene) {
	// reset everything to 100% opacity
	fadeReset();
	// hide everything not connected to the current selection
	if (gene) {
		d3.selectAll(".chart path.chord:not([gene='" + gene + "'])")
			.transition()
				.style("opacity", 0.02);
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
		d3.selectAll(".chart path.chord:not([cluster='" + cluster + "'])")
			.transition()
				.style("opacity", 0.02);
	}
}

/* reset all elements to 100% opacity
arguments: none

returns: nothing
*/
function fadeReset() {
	// reset everything to 100% opacity
	d3.selectAll(".chart path.chord")
		.transition()
			.style("opacity", 1.0);
}

/* data selection helper function
arguments: none

returns: nothing
*/
function selectData() {
	// highlight the currently active dataset
	$("#data-selector li")
		.removeClass("active");
	$("#data-selector li[data-number='" + active_dataset + "']")
		.addClass("active");

	// event listeners
	$("#data-selector li").bind("click", function(e){
		e.preventDefault();
		$("#data-selector").modal('hide');
		// force the backdrop to disappear because sometimes it doesn't automatically
		$('body').removeClass('modal-open');
		$('.modal-backdrop').remove();

		active_dataset = $(this).attr("data-number");
		updateGraphs( $(this).attr("data-number") );
	});
}
