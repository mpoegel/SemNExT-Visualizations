/// <reference path="./graph.ts"/>
/// <reference path="./munge.ts"/>
/// <reference path="./ui.ts"/>

let margin = {top: 180, right: 160, bottom: 160, left: 160},
		width = 960,
		height = 960,
		canvas = new CHeM.Canvas('.chart', margin, width, height);

UI.configure(canvas);

function debug() {
	UI.drawCompleteGraph({
			'@context': '',
			'@id': 'kegg.csv',
			'label': 'mTOR Kegg Pathways',
		}, 'kegg pathways');
}
