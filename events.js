// =============================================================================
// Gene Highlighting Settings
function clearHighlighting() {
	var svg = d3.select(".chart svg");
	$("#set-highlight-btns label").removeClass("active");
	$("#highlight-dom-cluster-btn").removeClass("active");

	svg.selectAll("g.group")
		.on("mouseover", null).on("mouseout", null).on("click", null);
	svg.selectAll(".heatmap_arc")
		.on("mouseover", null).on("mouseout", null).on("click", null);
	svg.selectAll(".cluster_arc")
		.on("mouseover", null).on("mouseout", null).on("click", null);
};

function setHighlightOnHover() {
	var svg = d3.select(".chart svg");
	clearHighlighting(svg);
	$("#set-hover-btn").addClass("active");
	svg.selectAll("g.group")
		.on("mouseover", fade(0.02))
		.on("mouseout", fade(1.0));
	svg.selectAll(".heatmap_arc")
		.on("mouseover", fade2(0.02))
		.on("mouseout", fade2(1.0));
	svg.selectAll(".cluster_arc")
		.on("mouseover", fadeCluster(0.02))
		.on("mouseout", fadeCluster(1.0));
};

function setHighlightOnClick() {
	var svg = d3.select(".chart svg");
	clearHighlighting(svg);
	$("#set-click-btn").addClass("active");
	svg.selectAll("g.group")
		.on("click", fadeToggle());
	svg.selectAll(".heatmap_arc")
		.on("click", fadeToggle2());
	svg.selectAll(".cluster_arc")
		.on("click", fadeToggleCluster());
};

$("#set-hover-btn").click(setHighlightOnHover);

$("#set-click-btn").click(setHighlightOnClick);

$("#set-no-highlight-btn").click(function() {
	clearHighlighting();
	$(this).addClass("active");
});

// =============================================================================
// Highlight dominant cluster
var highlight_dom_toggle = false;
$("#highlight-dom-cluster-btn").click(function() {
	if(!highlight_dom_toggle) {
		setHighlightOnClick();
		displayNone();
		var data_index = $("#data-selector").val();
		var c = data_files[data_index].domc;
		var g = d3.select(".chart svg")
			.selectAll("path.chord")
				.filter(function(d) { return clusters[d.source.index] == c ||
				 	clusters[d.target.index] == c; })
				.transition()
					.style("opacity", 1.0);
	}
	highlight_dom_toggle = !highlight_dom_toggle;
});

// =============================================================================
// highlight all or none (reset)
function displayAll() {
	var svg = d3.select(".chart svg");
	svg.selectAll("path.chord")
		.transition()
			.style("opacity", 1.0);
};

function displayNone() {
	var svg = d3.select(".chart svg");
	svg.selectAll("path.chord")
		.transition()
			.style("opacity", 0.02);
};

$("#display-all-btn").click(displayAll);
$("#display-none-btn").click(displayNone);

// =============================================================================
