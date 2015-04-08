/* =============================================================================

Matthew Poegel
March 27, 2015

Creates a layout appropriate for the campfire by creating two seperate views:
one for the wall (heatmap) and another for the floor (chord diagram).

============================================================================= */

/*
global config
*/
var margin = {top: 0, right: 0, bottom: 0, left: 0},
	// convert cluster number to cluster name
		clusterToStage = ['Pluripotency', 'Ectoderm', 'Neural Differentiation',
			'Cortical Specification', 'Early Layers', 'Upper Layers'],
		cookieRegistry = [],
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
		updateGraphs(1);
	}, 0);

	// initialize the cookies
	// $.cookie("active_gene", "");
	// $.cookie("active_cluster", "");
	// $.cookie("active_dataset", 0);
	// attach cookie listeners
	// listenForCookies("active_gene", fade);
	// listenForCookies("active_cluster", fadeCluster);
	// listenForCookies("active_dataset", updateGraphs);



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
				.on("mouseover", function(d) { $.cookie("active_gene", d.Gene_Symbol); })
				// .on("mouseout", function(d) { $.cookie("active_gene", ""); });
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
	var group_lengths = [];
	for (var i in chord.groups()) {
		group_lengths.push(chord.groups()[i].value + chord_padding);
	}
	return group_lengths;
}

/* set an event listener on a particular cookie
arguments: cookieName - name of the cookie to watch
					 callback   - function to call on cookie change
returns: value of the callback function evaluated at the new cookie value
*/
function listenForCookies(cookieName, callback) {
	setInterval(function() {
		if (cookieRegistry[cookieName]) {
			if ($.cookie(cookieName) != cookieRegistry[cookieName]) {
				// cookie changed, update the registry
				cookieRegistry[cookieName] = $.cookie(cookieName);
				return callback($.cookie(cookieName));
			}
		}
		else {
			// completely new cookie
			cookieRegistry[cookieName] = $.cookie(cookieName);
		}
	}, 100); // check for changes every 100ms
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
	$("#data-selector li[data-number='" + $.cookie("active_dataset") + "']")
		.addClass("active");

	// event listeners
	$("#data-selector li").bind("click", function(e){
		e.preventDefault();
		$("#data-selector").modal('hide');
		// force the backdrop to disappear because sometimes it doesn't automatically
		$('body').removeClass('modal-open');
		$('.modal-backdrop').remove();

		// $.cookie("active_dataset", $(this).attr("data-number"));
		updateGraphs( $(this).attr("data-number") );
	});
}
