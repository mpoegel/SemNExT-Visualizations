/// <reference path="./graph.ts"/>
/// <reference path="./munge.ts"/>

var margin = {top: 180, right: 160, bottom: 160, left: 160},
		width = 960,
		height = 960,
		canvas = new CHeM.Canvas('.chart', margin, width, height);

// Munge.fetch('12849').then((raw_data) => {
// 	var data = Munge.munge(raw_data),
//
// 			graph = new CHeM.Graph(data, canvas);
// });
Munge.fetch('autism_chord_data.csv', (raw_data: string[][]) => {
	var data = Munge.munge(raw_data);
	data.title = 'Autism';
	var graph = new CHeM.Graph(data, canvas)
		.drawChords()
		.drawClusterBands()
		.drawTextLabels()
		.drawCircularHeatmap()
		.drawClusterLegend()
		.drawHeatmapLegend()
		.drawTitle();

}, '/');
