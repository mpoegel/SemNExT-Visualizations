/// <reference path="../../typings/tsd.d.ts"/>
import request = require('request');
import _ = require('underscore');

interface dataCallback {
	(data: string[][]): any;
}

interface onErrorCallback {
	(e: Error, code?: number): any;
}

const SemNExT_URLs = {
	disease_matrix: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_disease?disease=',
	diseases_list: 'https://semnext.tw.rpi.edu/api/v1/list_known_diseases',
	kegg_matrix: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_kegg_pathway?pathway=',
	kegg_list: 'https://semnext.tw.rpi.edu/api/v1/list_known_kegg_pathways',
	custom_matrix: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_genes?symbols='
}

export function fetchDiseaseMatrix(diseaseId: string, callback: dataCallback, onError?: onErrorCallback) {
	fetchMatrix(diseaseId, callback, SemNExT_URLs.disease_matrix, onError);
}

export function fetchKeggPathwaysMatrix(keggId: string, callback: dataCallback, onError?: onErrorCallback) {
	fetchMatrix(keggId, callback, SemNExT_URLs.kegg_matrix, onError);
}

export function fetchCustomMatrix(genes: string, callback: dataCallback, onError?: onErrorCallback) {
	fetchMatrix(genes, callback, SemNExT_URLs.custom_matrix, onError);
}

export function fetchMatrix(id: string, callback: dataCallback, url, onError?: onErrorCallback) {
	request.get(url + id, function(error, response, body: string) {
		if (error || body.search(/500 Internal Server Error/gi) != -1) {
			let e = new Error();
			e.name = "SemNExT API Error"
			e.message = "Received an invalid response from the API."
			if (onError) {
				onError(e);
			}
			else {
				console.error(e);
			}
		}
		else {
			callback(_.map(body.split('\n'), (d) => {
				return d.split(',');
			}));
		}
	});
}

export function fetchDiseaseList(callback: (data: string) => any, onError?: onErrorCallback) {
	request.get(SemNExT_URLs.diseases_list, function(error, response, body) {
		if (error) {
			let e = new Error();
			e.name = "SemNExT API Error"
			e.message = "Failed to retrieve disease object list from the API."
			if (onError) {
				onError(e);
			}
			else {
				console.error(e);
			}
		}
		else {
			callback(body);
		}
	});
}

export function fetchKeggPathwaysList(callback: (data: KeggPathwayObject[]) => any, onError?: onErrorCallback) {
	request.get(SemNExT_URLs.kegg_list, function(error, response, body) {
		if (error) {
			let e = new Error();
			e.name = "SemNExT API Error"
			e.message = "Failed to retrieve Kegg object list from the API."
			if (onError) {
				onError(e);
			}
			else {
				console.error(e);
			}
		}
		else {
			callback(body);
		}
	});
}

export function findDisease(disease: string, callback: (result: string) => any, onError?: onErrorCallback): void {
	request.get(SemNExT_URLs.diseases_list + '?q=' + disease, function(error, response, body) {
		if (error) {
			let e = new Error();
			e.name = "SemNExT API Error"
			e.message = "Failed to retrieve disease object list from the API."
			if (onError) {
				onError(e);
			}
			else {
				console.error(e);
			}
		}
		else {
			callback(body);
		}
	});
}

export function findKeggPathway(pathway: string, callback: (result: string) => any, onError?: onErrorCallback): void {
	request.get(SemNExT_URLs.kegg_list + '?q=' + pathway, function(error, response, body) {
		if (error) {
			let e = new Error();
			e.name = "SemNExT API Error"
			e.message = "Failed to retrieve Kegg object list from the API."
			if (onError) {
				onError(e);
			}
			else {
				console.error(e);
			}
		}
		else {
			callback(body);
		}
	});
}

