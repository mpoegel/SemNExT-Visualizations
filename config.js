var margin = {top: 180, right: 160, bottom: 160, left: 160},
		width = 960 - margin.right - margin.left,
		height = 960 - margin.top - margin.bottom,
		innerRadius = Math.min(width, height) * .41,
		outerRadius = innerRadius * 1.07,
		cluster_band_width = 20,
		chord_padding = 0.02,
		fade_opacity = 0.15,
		heatmap_height = 100,
		clusters = [],

		arc = d3.svg.arc()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius),

		colorScale = d3.scale.linear()
			.range(["#232323", "green", "red"]),
		heatmapLegendScale = d3.scale.linear()
			.domain([0,3]),
			
		matlabColors = function(i) {
			return (['#F00', '#FF0', '#0F0', '#0FF', '#00F', '#F0F'])[(i-1)%6];
		},
		d3Cat10Colors = function(i) {
			return (['#D62728', '#FF7F0E', '#2CA02C', '#1F77B4', '#9467BD',
				'#8C564B'])[(i-1)%6];
		},

		colorGradientPrecision = 20,

		chord = d3.layout.chord()
			.padding(chord_padding)
			.sortSubgroups(d3.descending),

		heatmap_y = d3.scale.ordinal()
			.rangeRoundBands([0, heatmap_height]),

		diseaseObjs = [],

		clusterToStage = ['Pluripotency', 'Ectoderm', 'Neural Differentiation',
			'Cortical Specification', 'Early Layers', 'Upper Layers'],
		days = ['d0','d7','d12','d19','d26','d33','d49','d63','d77'];
