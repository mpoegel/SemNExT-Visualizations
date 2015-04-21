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
	clearHighlighting();
	$("#set-hover-btn").addClass("active");
	svg.selectAll("g.group")
		.on("mouseover", fade(0.15))
		.on("mouseout", fade(1.0));
	svg.selectAll(".heatmap_arc")
		.on("mouseover", fade2(0.15))
		.on("mouseout", fade2(1.0));
	svg.selectAll(".cluster_arc")
		.on("mouseover", fadeCluster(0.15))
		.on("mouseout", fadeCluster(1.0));
};

function setHighlightOnClick() {
	var svg = d3.select(".chart svg");
	clearHighlighting();
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
					.style("opacity", 1.0)
					.attr("visible", true);
	}
	highlight_dom_toggle = !highlight_dom_toggle;
});

// =============================================================================
// highlight all or none (reset)
$(".display-btn").click(function() {
	switch($(this).attr("data-action")) {
		case "all":
			displayAll();
			break;
		case "none":
			displayNone();
			break;
		case "invert":
			displayInvert();
			break;
	}
});

function displayAll() {
	var svg = d3.select(".chart svg");
	svg.selectAll("path.chord")
		.transition()
			.style("opacity", 1.0)
			.attr("visible", true);
};

function displayNone() {
	var svg = d3.select(".chart svg");
	svg.selectAll("path.chord")
		.transition()
			.style("opacity", 0.15)
			.attr("visible", false);
};

function displayInvert() {
	var hidden  = d3.selectAll("path.chord[visible=false]"),
			visible = d3.selectAll("path.chord[visible=true]");
	hidden.transition()
		.style("opacity", 1.0).attr("visible", true);
	visible.transition()
		.style("opacity", 0.15).attr("visible", false);
};

// =============================================================================
// expanded settings
var exp_set_toggle = false;
$("#expand-settings-btn").click(function() {
	$(this).empty();
	if (exp_set_toggle) {
		$(".expanded-settings-bar").slideUp();
		$(this).attr("title", "Show more settings.")
		$(this).append('<i class="fa fa-plus-square-o fa-2x"></i>');
	}
	else {
		$(".expanded-settings-bar").slideDown();
		$(this).attr("title", "Show less settings.")
		$(this).append('<i class="fa fa-minus-square-o fa-2x"></i>');
	}
	exp_set_toggle = !exp_set_toggle;
});

// =============================================================================
// download the diagram
$(".download-btn").click(function() {
	switch($(this).attr("data-target")) {
		case "svg":
			var a = document.createElement("a");
			a.download = getName() + ".svg";
			a.href = downloadSVG();
			a.click();
			break;
		case "png":
			downloadPNG();
			break;
		default: break;
	}
});

// grab the raw source of the SVG
function downloadSVG() {
	var html = d3.select("svg")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML;
  return imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);
}

// download as a PNG
function downloadPNG() {
	var canvas = document.createElement("canvas");
	canvas.width = width + margin.right + margin.left;
	canvas.height = height + margin.top + margin.bottom;
	var	context = canvas.getContext("2d"),
			image = new Image;
	image.src = downloadSVG();
	image.onload = function() {
		context.drawImage(image, 0, 0);
		var canvas_data = canvas.toDataURL("image/png");
		var a = document.createElement("a");
		a.download = getName() + ".png";
		a.href = canvas_data;
		a.click();
	}
}

function getName() {
	return data_files[$("#data-selector").val()].name;
}

// =============================================================================
// disease cross-highlighting
var gene_filter = {},
		disease_filter = {};

$(".disease-filter-btn").click(function() {
	switch($(this).attr("data-action")) {
		case "setFilter":
			updateDiseaseFilter();
			break;
		case "clearFilter":
			gene_filter = {};
			$("#active-filters").empty();
			displayAll();
			break;
		default: break;
	}
})

function updateDiseaseFilter() {
	var selected = $(".disease-gene-filter-list").val();
	if (!selected) return;
	for (var d=0; d<selected.length; d++) {
		$("#active-filters").append(selected[d] + ", ");
		var i = $(".disease-gene-filter-list option[name='" + selected[d] + "']")
			.attr("data-number");
		for (var g=0; g<data_files[i].labels.length; g++) {
			gene_filter[data_files[i].labels[g]] = true;
		}
	}
	displayNone();
	for (var g in gene_filter) {
		d3.selectAll("path.chord")
			.filter(function(d) { return d.source.name == g ||
				d.target.name == g; })
			.transition()
				.style("opacity", 1.0);
	}
}

// =============================================================================
// additional settings
$(".additional-settings").click(function() {
	switch($(this).attr("data-action")) {
		case "hideLegends":
			$(".clusterLegend").empty();
			$(".heatmapLegend").empty();
			$(this).text("Show Legends");
			$(this).attr("data-action", "showLegends");
			break;
		case "showLegends":
			drawClusterLegend(d3.select(".clusterLegend"));
			drawHeatmapLegend(d3.select(".heatmapLegend"));
			$(this).text("Hide Legends");
			$(this).attr("data-action", "hideLegends");
			break;
		default: break;
	}
});
