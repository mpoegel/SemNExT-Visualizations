// =============================================================================
// Gene Highlighting Settings
function clearHighlighting(svg) {
	svg.selectAll("g.group")
		.on("mouseover", null).on("mouseout", null).on("click", null);
	svg.selectAll(".heatmap_arc")
		.on("mouseover", null).on("mouseout", null).on("click", null);
	svg.selectAll(".cluster_arc")
		.on("mouseover", null).on("mouseout", null).on("click", null);

	console.log(svg.selectAll(".heatmap_arc"));
};

$("#set-hover-btn").click(function() {
	var svg = d3.select(".chart svg");
	clearHighlighting(svg);
	svg.selectAll("g.group")
		.on("mouseover", fade(0.02))
		.on("mouseout", fade(1.0));
	svg.selectAll(".heatmap_arc")
		.on("mouseover", fade2(0.02))
		.on("mouseout", fade2(1.0));
	svg.selectAll(".cluster_arc")
		.on("mouseover", fadeCluster(0.02))
		.on("mouseout", fadeCluster(1.0));
});

$("#set-click-btn").click(function() {
	var svg = d3.select(".chart svg");
	clearHighlighting(svg);
	svg.selectAll("g.group")
		.on("click", null);
	svg.selectAll(".heatmap_arc")
		.on("click", null);
	svg.selectAll(".cluster_arc")
		.on("click", null);
});

$("#set-no-highlight-btn").click(function() {
	var svg = d3.select(".chart svg");
	clearHighlighting(svg);
});

// =============================================================================
