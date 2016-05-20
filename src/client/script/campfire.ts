/// <reference path="./../../../typings/tsd.d.ts"/>

import Munge = require('./../../../src/helpers/munge');
import CHeM = require('./helpers/graph');

var $ = require('jquery');

namespace Campfire {
	const 
		MIN_GRAPH_SIZE = 10,
		ROOT_PATH = (function() {
			let path = location.pathname.split('/');
			if (path.length > 3) return '/' + path[1] + '/';
			else return '/';
		})(),
		margin = { top: 0, right: 0, bottom: 0, left: 0 },
		floor_width = 1050,
		floor_height = 1050,
		wall_width = 6400,
		wall_height = 800;
		
	let wallHandle = window.open('wall.html'),
		floorCanvas: CHeM.Canvas,
		wallCanvas: CHeM.Canvas,
		floorGraph: CHeM.Graph,
		wallGraph: CHeM.Graph;
	
	// wait while wall.html is opened
	let init_iid = window.setInterval(() => {
		if (wallHandle && wallHandle.d3select) {
			window.clearInterval(init_iid);
			floorCanvas = new CHeM.Canvas(d3.select('#floor'), margin, floor_width, floor_height);
			wallCanvas  = new CHeM.Canvas(wallHandle.d3select('#wall'), margin, wall_width, wall_height, false);
			ignite({
				'@id': 'https://semnext.tw.rpi.edu/id/source/cortecon-neuralsci-org/cortecon/disease/12849',
				label: 'Autism'
			}, 'disease');
		}
	}, 100);
	
	function errorHandler(error: Error): void {
		console.error(error);
	}
	
	export function ignite(semnextObj: DiseaseObject|KeggPathwayObject|CustomObject,
							data_type: string, callback ?: () => any): void {
		try {
			if (! floorCanvas) {
				throw new Error('Floor Canvas not defined.');
			}
			if (! wallCanvas) {
				throw new Error('Wall Canvas not defined.');
			}
			if (! wallHandle) {
				throw new Error('Wall Handle not defined.');
			}
			floorCanvas.clear();
			$.get(ROOT_PATH + 'api/v1/matrix/' + data_type + '/', { id: semnextObj['@id'] })
				.done((raw_data: string[][]) => {
					let data = Munge.munge(raw_data);

					if (data.labels.length < MIN_GRAPH_SIZE) {
						throw new Error('Not enough data received to create CHeM.');
					}
					data.title = semnextObj.label;
					try {
						floorGraph = new CHeM.Graph(data, floorCanvas, {
								onMouseOver: (d, i) => {
									if (d.genes !== undefined) {
										CHeM.getHeatMapClusterFader(wallHandle.d3select('#wall'), 0.02)(d, i);
									}
									else {
										CHeM.getHeatMapFader(wallHandle.d3select('#wall'), 0.02)(d, i);
									}
								},
								onMouseOut: (d, i) => {
									if (d.genes !== undefined) {
										CHeM.getHeatMapClusterFader(wallHandle.d3select('#wall'), 1.00)(d, i);
									}
									else {
										CHeM.getHeatMapFader(wallHandle.d3select('#wall'), 1.00)(d, i);
									}
								}
							})
							.drawChords()
							.drawClusterBands();
					}
					catch (e) {
						throw new Error('Creation of Floor CHeM reached an unknown error.');
					}
					try {
						let group_widths = floorGraph.getGroupWidths();
						wallGraph = new CHeM.Graph(data, wallCanvas, {
								onMouseOver: (d, i) => {
									CHeM.getFader(d3.select('#floor'), 0.02)(d, i);
								},
								onMouseOut: (d, i) => {
									CHeM.getFader(d3.select('#floor'), 1.00)(d, i);
								}
							})
							.drawRectangularHeatmap(group_widths);
					}
					catch (e) {
						console.error(e);
						throw new Error('Creation of Wall CHeM reached an unknown error.');
					}					
				})
				.fail((error) => {
					let e = new Error(error.statusText);
					e.name = error.status;
					errorHandler(e);
				});
		}
		catch (error) {
			let e = new Error(error.message);
			e.name = 'Campfire Could Not Be Lit';
			errorHandler(e);
		}
	}
	
}
