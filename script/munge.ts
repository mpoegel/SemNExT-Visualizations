/// <reference path="../typings/tsd.d.ts"/>

module Munge {

	export interface chem_data {
		chord_matrix: number[][];
		clusters: number[];
		labels: string[];
		heatmap: heatmap_datum[];
		domc?: number;
		title?: string;
	}

	interface heatmap_datum {
		label: string;
		day: string;
		value: number;
		cluster: number;
		index: number;
	}

	let SemNExT_URLs = {
		disease: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_disease?disease=',
		list_diseases: 'https://semnext.tw.rpi.edu/api/v1/list_known_diseases'
	}

	export function fetchMatrix(diseaseId: string, callback: (data: string[][]) => any,
												url = SemNExT_URLs.disease) {
		$.get(url + diseaseId)
			.done((raw_data: string) => {
			 	callback(_.map(raw_data.split('\n'), (d) => {
					return d.split(',');
				}));
			})
			.fail((error) => {
				$('.chart-status').empty();
				$('.chart-status')
					.append('<div class="panel panel-danger">' +
						'<div class="panel-heading">Error</div>' +
						'<div class="panel-body">Could not retrieve data.' +
						'</div>');
				throw error;
			});
	}

	export function fetchDiseaseList(callback: (data: DiseaseObject[]) => any) {
		$.get(SemNExT_URLs.list_diseases)
			.done((raw_data: DiseaseObject[]) => {
					callback(raw_data);
				})
			.fail((error) => {
					throw error;
				});
	}

	export function munge(data: string[][]): chem_data {
		let header = data[0],
				labels = [];
		// grab all the labels from the header
		for (let i = 0; i < header.length && header[i] !== 'Cluster';
			labels.push(header[i++]));

		let	matrix = [], 						// square matrix of gene connections
				row = [],								// vector used to construct the matrix
				count = 0,							// track the index of each gene
				day_re = /[d]\d{1,2}/,  // regular expression to find heatmap data
				heatmap = [],						// heatmap data
				clusters = [];

		for (let i = 1; i < data.length; i++) {
	    row = [];
			// get the data for the clusters and connection matrix
			for (let k = 0; k < data[i].length; k++) {
		    if (data[i][k] === '') continue;

				else if (header[k] === 'Cluster') clusters.push( +data[i][k] );

				else if (day_re.exec(header[k])) {
					heatmap.push({
						label: labels[i-1],
						day: header[k],
						value: +data[i][k],
						cluster: clusters[i-1],
						index: i-1
					});
				}

				else row.push( +data[i][k] );
			} // end inner loop
			if (row.length === header.length - 10) matrix.push(row);
		} // end outer loop
		return {
			chord_matrix: matrix,
			heatmap: heatmap,
			clusters: clusters,
			labels: labels,
		}
	}

	export function semantic() {
		// todo
	}

}
