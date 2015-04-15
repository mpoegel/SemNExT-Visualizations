var margin = {top: 180, right: 160, bottom: 160, left: 160},
		width = 960 - margin.right - margin.left,
		height = 960 - margin.top - margin.bottom,
		innerRadius = Math.min(width, height) * .41,
		outerRadius = innerRadius * 1.07,
		cluster_band_width = 20,
		chord_padding = 0.02,
		heatmap_height = 100,
		clusters = [];

var arc = d3.svg.arc()
		.innerRadius(innerRadius)
		.outerRadius(outerRadius);

var data_files = [
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
	},
	{
		name: 'Williams-Beuren Syndrome',
		file: 'WilliamsBeurenSyndrome_chord_data.csv',
		domc: 1
	}
],
		clusterToStage = ['Pluripotency', 'Ectoderm', 'Neural Differentiation',
			'Cortical Specification', 'Early Layers', 'Upper Layers'];


// create a default chart on load
$(document).ready(function() {
	// add the list of data sets to the data selection menu and the disease filter
	// 	list; munge the labels for each data set
	for (var i = 0; i < data_files.length; i++) {
		$("<option>")
			.attr("data-number", i)
			.attr("name", data_files[i].name)
			.text(data_files[i].name)
			.appendTo( $(".disease-gene-filter-list") );
		$("<option>")
			.attr("value", i)
			.text(data_files[i].name)
			.appendTo( $("#data-selector") );
		if (i == 1) {
			$("<option selected>")
				.attr("value", i)
				.text(data_files[i].name)
				.appendTo( $("#data-selector") );
		}
		mungeLabels(data_files[i].file, i);
	}

	updateGraph();

});

/* this function is called whenever the user selects a new dataset from the
 		dropdown

*/
function updateGraph() {
	// reset settings
	$("#set-hover-btn").addClass("active");
	$("#set-highlight-btns label").removeClass("active");
	$(".chart").empty();

	var data_index = $("#data-selector").val();

	var data_file = data_files[data_index].file;
	var title = data_files[data_index].name

	mungeData(data_file).then(function(data) {
		createGraph(data.chord_matrix, data.clusters, data.gene_symbols,
			data.heatmap, title);
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
		d3.csv("chord_data/" + file_name, function(error, data) {
			// extract the labels from the input data
			var gene_symbols = [];
			for (var gene in data['0']) gene_symbols.push(gene);

			var	matrix = [], 						// square matrix of gene connections
					row = [],								// vector used to construct the matrix
					count = 0,							// track the index of each gene
					day_re = /[d]\d{1,2}/,  // regular expression to find heatmap data
					heatmap = [];						// heatmap data
			clusters = [];

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

/*

*/
function mungeLabels(file_name, index) {
	d3.csv("chord_data/" + file_name, function(error, data) {
		gene_symbols = [];
		for (var gene in data['0']) gene_symbols.push(gene);
		data_files[index].labels = gene_symbols;
	});
}

/* create a full sized graph
arguments: chord_matrix- matrix of the gene connections
					 clusters- 		 translate index to cluster
					 labels-			 translate index to gene symbol
					 heatmap-			 data from which to create the heatmap
					 title-				 title of the graph

returns: nothing
*/
function createGraph(chord_matrix, clusters, labels, heatmap, title) {
	var svg = svg = d3.select(".chart").append("svg")
				.attr("height", height + margin.top + margin.bottom)
				.attr("width", width + margin.left + margin.right)
				.style("font-size", "10px")
				.style("font-family", "Arial, Helvetica, sans-serif")
			.append("g")
				.attr("transform", "translate(" + (width/2 + margin.left) + "," + (height/2 + margin.top) + ")");

	var chord = d3.layout.chord()
			.padding(chord_padding)
			.sortSubgroups(d3.descending);

	var fill = d3.scale.category10(),
			heatmap_y = d3.scale.ordinal()
				.rangeRoundBands([0, heatmap_height]),
			colorScale = d3.scale.linear()
				.range(["#232323", "green", "red"]);

	chord.matrix(chord_matrix);

	// make the colorScale domain to be mean +/- 2*sigma
	var mu = d3.mean(heatmap, function(d) { return d.Value; }),
			sd = 0;
	heatmap.forEach(function(d) { sd += Math.pow(d.Value - mu,2); });
	sd = Math.sqrt(sd / heatmap.length);

	colorScale_min = mu - 2 * sd;
	colorScale_max = mu + 2 * sd;
	colorScale_pivot = mu;

	colorScale.domain([colorScale_min, colorScale_pivot, colorScale_max]);
	heatmap_y.domain(heatmap.map(function(d) { return d.Day; }));

	var g = svg.selectAll("g.group")
			.data(chord.groups)
		.enter().append("svg:g")
			.attr("class", "group")
			.each(function(d,i) {
				d.angle = (d.startAngle + d.endAngle) / 2;
				d.cluster = clusters[i];
				d.gene = labels[i];
			})
			.on("mouseover", fade(.15))
			.on("mouseout", fade(1.0));

	g.append("svg:path")
			.style("stroke", function(d) { return fill(clusters[d.index]); })
			.style("fill", function(d) { return fill(clusters[d.index]); })
			.attr("d", arc);

	// add gene labels
	g.append("svg:text")
			.attr("dy", ".35em")
			.attr("class", "chord-label")
			.attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
			.attr("transform", function(d) {
				return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
						+ "translate(" + (outerRadius + 125) + ")"
						+ (d.angle > Math.PI ? "rotate(180)" : "");
			})
			.text(function(d) { return labels[d.index]; });

	var blank_arc = d3.svg.arc();
	// heatmap around the chord diagram
	svg.selectAll(".heatmap_arc")
			.data(heatmap)
		.enter().append("path")
			.attr("d", blank_arc
				.innerRadius(function(d) { return outerRadius + cluster_band_width + heatmap_y(d.Day); })
				.outerRadius(function(d) { return outerRadius + cluster_band_width + heatmap_y(d.Day) + heatmap_height/9; })
				.startAngle(function(d,i) { return chord.groups()[Math.floor(i/9)].startAngle - chord_padding/2; })
				.endAngle(function(d,i) { return chord.groups()[Math.floor(i/9)].endAngle + chord_padding/2; })
			)
			.attr("class", "heatmap_arc")
			.attr("fill", function(d) { return colorScale(d.Value); })
			.on("mouseover", fade2(.15))
			.on("mouseout", fade2(1.0))

	// draw the cluster bands
	var cluster_bands = [],
			band = {},
			g = [];
	clusters.map(function(d,i) {
		// new cluster is begining so add the old one
		if (i != 0 && d != clusters[i-1]) {
			g.push(labels[i]);
			band.genes = g;
			band.endAngle = (i == clusters.length-1 ? chord.groups()[i].endAngle : chord.groups()[i-1].endAngle);
			if (!band.startAngle) { band.startAngle = 0; band.cluster = 1; }
			cluster_bands.push(band);
			band = {};
			g = [];
			band.cluster = d;
			band.startAngle = chord.groups()[i].startAngle;
		}
		g.push(labels[i]);
	});
	g.push(labels[clusters.length-1]);
	band.genes = g;
	band.endAngle = chord.groups()[clusters.length-1].endAngle;
	cluster_bands.push(band);

	svg.selectAll(".cluster_arc")
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
			.on("mouseover", fadeCluster(.15))
			.on("mouseout", fadeCluster(1.0));

	// draw chords
	svg.selectAll("path.chord")
			.data(chord.chords)
		.enter().append("svg:path")
			.attr("class", "chord")
			.attr("visible", true)
			.each(function(d) {
				d.source.name = labels[d.source.index];
				d.target.name = labels[d.target.index];
			})
			.style("stroke", function(d) { return d3.rgb(fill(clusters[d.source.index])).darker(); })
			.style("fill", function(d) { return fill(clusters[d.source.index]); })
			.attr("d", d3.svg.chord().radius(innerRadius));

	// draw a legend for the clusters in the upper right corner
	var clusterLegend = svg.append("g")
			.attr("class", "clusterLegend")
			.attr("transform", "translate(" + (width/2 + margin.top*.30) + "," + (-height/2 - margin.right*.90) + ")")
			.attr("height", 100)
			.attr("width", 100);

	clusterLegend.selectAll("g")
			.data(d3.range(1, clusterToStage.length+1))
		.enter().append("g")
			.each(function(d, i) {
				var g = d3.select(this);
				g.append("rect")
					.attr("x", 50)
					.attr("y", i*20)
					.attr("width", 10)
					.attr("height", 10)
					.style("fill", fill(d));
				g.append("text")
					.attr("x", 40)
					.attr("y", i*20 + 10)
					.attr("height", 30)
					.attr("width", 100)
					.attr("fill", fill(d))
					.attr("text-anchor", "end")
					.style("font-size", "16px")
					.text(clusterToStage[i]);
			});

	// draw a legend for the heatmap in the upper left corner
	var heatmapLegend = svg.append("g")
			.attr("class", "heatmapLegend")
			.attr("transform", "translate(" + (-width/2 - margin.top*.30) + "," + (-height/2 - margin.left*.90) + ")")
			.attr("height", 100)
			.attr("width", 100);

	var heatmapLegendScale = d3.scale.linear()
			.domain([0,3])
			.range(colorScale.domain());

	heatmapLegend.selectAll("g")
			.data(d3.range(0,7))
		.enter().append("g")
			.each(function(d) {
				var g = d3.select(this);
				g.append("rect")
					.attr("x", -65)
					.attr("y", d*20)
					.attr("width", 20)
					.attr("height", 20)
					.style("fill", colorScale(heatmapLegendScale(d)));
				g.append("text")
					.attr("x", -40)
					.attr("y", d*20+15)
					.text(Math.round(heatmapLegendScale(d) * 10000) / 10000 );
			});

	// add a title to the top
	var t = svg.append("text")
			.attr("class", "title")
			.attr("transform", "translate(0," + (-height/2 - margin.top*.80) + ")")
			.attr("text-anchor", "middle")
			.style("font-size", "32px")
			.style("font-family", "Arial, Helvetica, sans-serif")
			.text(title);
}

// Returns an event handler for fading a given chord group
function fade(opacity) {
	return function(g, i) {
		d3.selectAll("path.chord")
				.filter(function(d) { return d.source.index != i && d.target.index != i; })
			.transition()
				.style("opacity", opacity)
				.attr("visible", opacity == 1);
	};
}

function fade2(opacity) {
	return function(g,i) {
		d3.selectAll("path.chord")
				.filter(function(d) { return d.source.index != g.Index && d.target.index != g.Index; })
			.transition()
				.style("opacity", opacity)
				.attr("visible", opacity == 1);
	}
}

function fadeCluster(opacity) {
	return function(g, i) {
		d3.selectAll("path.chord")
				.filter(function(d) { return clusters[d.source.index] != g.cluster &&
					clusters[d.target.index] != g.cluster; })
			.transition()
				.style("opacity", opacity)
				.attr("visible", opacity == 1);
	}
}

function fadeToggle() {
	return function(g,i) {
		var g = d3.selectAll("path.chord")
					.filter(function(d) { return d.source.index == i || d.target.index == i; });
		if (g.style("opacity") == 1) {
			g.transition().style("opacity", 0.02)
				.attr("visible", false);
		}
		else {
			g.transition().style("opacity", 1.0)
				.attr("visible", true);
		}
	};
}

function fadeToggle2() {
	return function(g,i) {
		var g = d3.selectAll("path.chord")
					.filter(function(d) { return d.source.index == g.Index ||
						d.target.index == g.Index; });
		if (g.style("opacity") == 1) {
			g.transition().style("opacity", 0.02)
				.attr("visible", false);
		}
		else {
			g.transition().style("opacity", 1.0)
				.attr("visible", true);
		}
	};
}

function fadeToggleCluster() {
	return function(g, i) {
		var g = d3.selectAll("path.chord")
				.filter(function(d) { return clusters[d.source.index] == g.cluster ||
					clusters[d.target.index] == g.cluster; });
		if (g.style("opacity") == 1) {
			g.transition().style("opacity", 0.02);
		}
		else {
			g.transition().style("opacity", 1.0);
		}
	};
}
