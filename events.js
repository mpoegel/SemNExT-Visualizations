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
		.on("mouseover", fade(0.20))
		.on("mouseout", fade(1.0));
	svg.selectAll(".heatmap_arc")
		.on("mouseover", fade2(0.20))
		.on("mouseout", fade2(1.0));
	svg.selectAll(".cluster_arc")
		.on("mouseover", fadeCluster(0.20))
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
			.style("opacity", 0.20);
};

$("#display-all-btn").click(displayAll);
$("#display-none-btn").click(displayNone);

// =============================================================================
// expanded settings
var exp_set_toggle = false;
$("#expand-settings-btn").click(function() {
	if (exp_set_toggle) {
		$(".expanded-settings-bar").slideUp();
		$(this).text("Expand Settings");
	}
	else {
		$(".expanded-settings-bar").slideDown();
		$(this).text("Hide Settings");
	}
	exp_set_toggle = !exp_set_toggle;
});

// =============================================================================
// download the SVG (from stack overflow holla)
$("#download-btn").click(function(e) {
	e.preventDefault();
	//get svg element.
	var svg = document.getElementById("chart-1");

	//get svg source.
	var serializer = new XMLSerializer();
	var source = serializer.serializeToString(svg);

	//add name spaces.
	if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
	    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
	}
	if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
	    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
	}

	//add xml declaration
	source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

	//convert svg source to URI data scheme.
	var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);

	//set url value to a element's href attribute.
	window.location.href = url;
});
