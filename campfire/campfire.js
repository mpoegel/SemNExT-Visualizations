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
			'Cortical Specification', 'Early Layers', 'Upper Layers'];


// initialize charts on page load
$(document).ready(function() {

	mungeData("autism_chord_data.csv").then(function(data) {
		updateWall(data.heatmap);
	});

});

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
arguments: disease - name of the disease to be put on the wall

returns: nothing
*/
function updateWall(heatmap_data) {
	// get a blank slate to work with
	$("#wall").empty();

	// define the width and height of the heatmap
	// campfire wall dimensions are 6400x800
	var	width = 6400 - margin.left - margin.right,
			height = 800 - margin.top - margin.bottom;

	// create x and y scales and a color scale to fill the individual boxes of
	// the heatmap
	var x = d3.scale.ordinal()
				.rangeRoundBands([0, width]),
			y = d3.scale.ordinal()
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

	// map the domain of the x scale to the gene_symbols
	x.domain(heatmap_data.map(function(d) { return d.Gene_Symbol; }));
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
				.attr("x", function(d) { return x(d.Gene_Symbol); })
				.attr("y", function(d) { return y(d.Day); })
				.attr("width", x.rangeBand())
				.attr("height", box_height)
				.style("fill", function(d) { return colorScale(d.Value); });
}

/* update the chord diagram on the wall
arguments: disease - name of the disease to be put on the wall

returns: probably something
*/
function updateFloor(disease) {

	var	width = 1050 - margin.right - margin.left,
			height = 1050 - margin.top - margin.bottom,
			innerRadius = Math.min(width, height) * .41,
			outerRadius = innerRadius * 1.07,
			cluster_band_width = 20,
			chord_padding = 0.02;

	var chord = d3.layout.chord()
		.padding(chord_padding)
		.sortSubgroups(d3.descending);

	var arc = d3.svg.arc()
		.innerRadius(innerRadius)
		.outerRadius(outerRadius);



}
