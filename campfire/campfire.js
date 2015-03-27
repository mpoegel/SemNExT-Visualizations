/* =============================================================================

Matthew Poegel
March 27, 2015

Creates a layout appropriate for the campfire by creating two seperate views:
one for the wall (heatmap) and another for the floor (chord diagram).

============================================================================= */

// global config
var margin = {top: 0, right: 0, bottom: 0, left: 0};


// initialize charts on page load
$(document).ready(function() {

	updateWall("autism");

});


/* update the heatmap on the wall
arguments: disease - name of the disease to be put on the wall

returns: nothing
*/
function updateWall(disease) {
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

	// load the data from the csv file asynchronously
	d3.csv("../chord_data/" + disease + "_heatmap_data.csv", function(error, data) {
		// mapping from gene_symbol to cluster number
		nameToCluster = {};
		// data munging
		data.forEach(function(d) {
			d.Value = +d.Value;
			d.Cluster = +d.Cluster;
			if (!(d in nameToCluster)) {
				nameToCluster[d.Gene_Symbol] = d.Cluster;
			}
		});

		// since there are 9 days for each datum point, the box heights are defined
		// as follows
		var box_height = height / 9;

		// map the domain of the x scale to the gene_symbols
		x.domain(data.map(function(d) { return d.Gene_Symbol; }));
		// map the domain of the y scale to the day numbers
		y.domain(data.map(function(d) { return d.Day; }));

		// make the colorScale domain to be the mean +/- 2*sigma
		// this does a good job of eliminating the outliers and preventing red or
		// green to be over-dominant
		var mu = d3.mean(data, function(d) { return d.Value; }),
				sd = 0;
		data.forEach(function(d) { sd += Math.pow(d.Value - mu,2); });
		sd = Math.sqrt(sd / data.length);
		var colorScale_min   = mu - 2 * sd,
				colorScale_max   = mu + 2 * sd,
				colorScale_pivot = mu;
		colorScale.domain([colorScale_min, colorScale_pivot, colorScale_max]);

		// each datum points represents one tile
		chart.selectAll(".tile")
					.data(data)
				.enter().append("rect")
					.attr("class", "tile")
					.attr("x", function(d) { return x(d.Gene_Symbol); })
					.attr("y", function(d) { return y(d.Day); })
					.attr("width", x.rangeBand())
					.attr("height", box_height)
					.style("fill", function(d) { return colorScale(d.Value); });
	}); // end csv read
}
