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

	const SemNExT_URLs = {
		disease_matrix: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_disease?disease=',
		diseases_list: 'https://semnext.tw.rpi.edu/api/v1/list_known_diseases',
		kegg_matrix: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_kegg_pathway?pathway=',
		kegg_list: 'https://semnext.tw.rpi.edu/api/v1/list_known_kegg_pathways',
		custom_matrix: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_genes?symbols='
	}

	export function fetchDiseaseMatrix(diseaseId: string, callback: (data: string[][]) => any) {
		fetchMatrix(diseaseId, callback, SemNExT_URLs.disease_matrix);
	}

	export function fetchKeggPathwaysMatrix(keggId: string, callback: (data: string[][]) => any) {
		fetchMatrix(keggId, callback, SemNExT_URLs.kegg_matrix);
	}

	export function fetchCustomMatrix(genes: string, callback: (data: string[][]) => any) {
		fetchMatrix(genes, callback, SemNExT_URLs.custom_matrix);
	}

	function fetchMatrix(id: string, callback: (data: string[][]) => any, url) {
		$.get(url + id)
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
		$.get(SemNExT_URLs.diseases_list)
			.done((raw_data: DiseaseObject[]) => {
				callback(raw_data);
			})
			.fail((error) => {
				throw error;
			});
	}

	export function fetchKeggPathwaysList(callback: (data: KeggPathwayObject[]) => any) {
		$.get(SemNExT_URLs.kegg_list)
			.done((raw_data: KeggPathwayObject[]) => {
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
