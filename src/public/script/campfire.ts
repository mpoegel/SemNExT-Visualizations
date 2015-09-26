/// <reference path="../../../typings/tsd.d.ts"/>
/// <reference path="./graph.ts"/>
/// <reference path="./munge.ts"/>
/// <reference path="./ui.ts"/>

namespace Campfire {
	const 
		MIN_GRAPH_SIZE = 10,
		margin = { top: 0, right: 0, bottom: 0, left: 0 },
		width = 1050,
		height = 1050;
	
	export let wallHandle = window.open('wall.html'),
		floorCanvas: CHeM.Canvas,
		wallCanvas: CHeM.Canvas,
		floorGraph: CHeM.Graph,
		wallGraph: CHeM.Graph;
	
	setTimeout(() => {
		// wait while wall.html is opened
		while (wallHandle === undefined);
		floorCanvas = new CHeM.Canvas(d3.select('#floor'), margin, width, height);
		wallCanvas  = new CHeM.Canvas(wallHandle.d3select('#wall'), margin, width, height);
		// debug();
	}, 100);
	
	function errorHandler(error: Error): void {
		console.error(error);
	}
	/*
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
			(function() {
				if (data_type === 'disease')
					return Munge.fetchDiseaseMatrix;
				else if (data_type === 'kegg pathways')
					return Munge.fetchKeggPathwaysMatrix;
				else if (data_type === 'custom')
					return Munge.fetchCustomMatrix;
				else
					throw new Error('Invalid data type');
			})()(semnextObj['@id'], (raw_data: string[][]) => {
				let data = Munge.munge(raw_data);
				if (data.labels.length < MIN_GRAPH_SIZE)
					throw new Error('Not enough data received to create CHeM.');
				data.title = semnextObj.label;
				try {
					floorGraph = new CHeM.Graph(data, floorCanvas, 0.02, 0, 0.02, 10, 20)
						.drawChords()
						.drawClusterBands();
				}
				catch (e) {
					throw new Error('Creation of CHeM reached an unknown error.');
				}
			});
		}
		catch (error) {
			let e = new Error(error.message);
			e.name = 'Campfire Could Not Be Lit';
			errorHandler(e);
		}
	}
	
	export function debug() {
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
			wallCanvas.clear();
			Munge.fetchLocalMatrix('../kegg.csv', (raw_data: string[][]) => {
				let data = Munge.munge(raw_data);
				if (data.labels.length < MIN_GRAPH_SIZE) {
					throw new Error('Not enough data received to create CHeM.');
				}
				data.title = 'Debug';
				try {
					floorGraph = new CHeM.Graph(data, floorCanvas, 0.02, 0, 0.02, 10, 20)
						.drawChords()
						.drawClusterBands();
				}
				catch (e) {
					throw new Error('Creation of CHeM reached an unknown error.');
				}
			});
		}
		catch (error) {
			let e = new Error(error.message);
			e.name = 'Campfire Could Not Be Lit';
			errorHandler(e);
		}
	}
	*/
}
