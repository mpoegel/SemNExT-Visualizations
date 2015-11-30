/**
 * Analysis module for cluster enrichment computations
 */

/// <reference path="../typings/tsd.d.ts" />

import Analysis = require('../src/helpers/analysis');
import Munge    = require('../src/helpers/munge');
import Semnext  = require('../src/models/semnext');

var _ = require('underscore');

const clusterToStage = ['Pluripotency', 'Ectoderm', 'Neural Differentiation', 
	'Cortical Specification', 'Early Layers', 'Upper Layers'];

module ClusterEnrichment {
	
	/**
	 * Representation of the enrichment data to output for each input
	 */
	interface IEnrichmentObject {
		label: string,
		num_genes: number,
		Pluripotency: IanalysisObject,
		Ectoderm: IanalysisObject,
		'Neural Differentiation': IanalysisObject,
		'Cortical Specification': IanalysisObject,
		'Early Layers': IanalysisObject,
		'Upper Layers': IanalysisObject
	}
	
	/**
	 * Representation of enrichment computations
	 */
	interface IanalysisObject {
		log_odds: number,
		pval: number,
	}
	
	/**
	 * Run the enrichment analysis on the given input (driver function)
	 * @param input {string[]} list of inputs to run enrichment analysis on
	 * @param input_type {string} type of input, either "disease" or "kegg"
	 * @callback {(x: IEnrichmentObject[]) => any} callback function to be 
	 * 	called with the resulting analysis when the analysis is completed on
	 * 	for all the inputs
	 * @returns {void} 
	 */
	export function run(input: string[], input_type: string, callback: (x: IEnrichmentObject[]) => any): void {
		let promises = [];
		if (input_type === 'disease') {
			for (var i in input) {
				promises.push(new Promise((resolve, reject) => {
					runDiseaseAnalysis(input[i], resolve);
				}));
			}
		}
		else if (input_type === 'kegg') {
			for (var i in input) {
				promises.push(new Promise((resolve, reject) => {
					runKeggAnalysis(input[i], resolve);
				}));
			}
		}
		Promise.all(promises).then((result) => {
			callback(_.flatten(result));
		});
	}
	
	/**
	 * Run the cluster analysis on a given disease by search for the 
	 * 	JSON-LD data from the API and then retreiving the list of 
	 * 	genes in the data set to run the analysis on
	 * @param disease {string} input disease
	 * @param callback {(x: IEnrichmentObject[]) => any} function to 
	 * 	call when the analysis is complete.
	 * @returns {void}
	 */
	export function runDiseaseAnalysis(disease: string, callback: (x: IEnrichmentObject[]) => any): void {
		let promises = [];
		Semnext.findDisease(disease, (error, raw_response) => {
			if (error) {
				process.stdout.write(`\x1b[31m Search for ${disease} failed. \x1b[0m \n`);
				callback([]);
			}
			let response = JSON.parse(raw_response);
			if (response.length === 0) {
				process.stdout.write(`\x1b[31m Search for ${disease} returned no results. \x1b[0m \n`);
				callback([]);
			} 
			for (var i=0; i<response.length; i++) {
				(function(self) {
					promises.push(new Promise((resolve, reject) => {
						Semnext.fetchDiseaseMatrix(self['@id'], function(raw_data) {
							let enrichmentObj = compute(raw_data);
							enrichmentObj.label = self.label;
							process.stdout.write(`\x1b[32m Completed ${self.label}. \x1b[0m \n`);
							printSignificant(enrichmentObj);
							resolve(enrichmentObj);
						}, function(err) {
							process.stdout.write(`\x1b[31m Fetch for ${self.label} failed. \x1b[0m \n`);
							resolve([]);
						});
					}));
				})(response[i]);
			}
			Promise.all(promises).then(callback);
		});
	}
	
	/**
	 * Run the cluster analysis on a given KEGG pathway by search for the 
	 * 	JSON-LD data from the API and then retreiving the list of 
	 * 	genes in the data set to run the analysis on
	 * @param pathway {string} input KEGG pathway
	 * @param callback {(x: IEnrichmentObject[]) => any} function to 
	 * 	call when the analysis is complete.
	 * @returns {void}
	 */
	export function runKeggAnalysis(pathway: string, callback: (IEnrichmentObject) => any): void {
		let promises = [];
		Semnext.findKeggPathway(pathway, (error, raw_response) => {
			if (error) {
				process.stdout.write(`\x1b[31m Search for ${pathway} failed. \x1b[0m \n`);
				callback([]);
			}
			let response = JSON.parse(raw_response);
			if (response.length === 0) {
				process.stdout.write(`\x1b[31m Search for ${pathway} returned no results. \x1b[0m \n`);
				callback([]);
			}
			for (var i=0; i<response.length; i++) {
				(function(self) {
					promises.push(new Promise((resolve, reject) => {
						Semnext.fetchKeggPathwaysMatrix(self['@id'], function(raw_data) {
							let enrichmentObj = compute(raw_data);
							enrichmentObj.label = self.label;
							process.stdout.write(`\x1b[32m Completed ${self.label}. \x1b[0m \n`);
							printSignificant(enrichmentObj);
							resolve(enrichmentObj);
						}, function(err) {
							process.stdout.write(`\x1b[31m Fetch for ${self.label} failed. \x1b[0m \n`);
							resolve([]);
						});
					}));
				})(response[i]);
			}
			Promise.all(promises).then(callback);
		});
	}
	
	/**
	 * Crunch the numbers for the enrichment analysis for each of the six
	 * 	clusters
	 * @param raw_data {string[][]} raw data return from the Semnext API
	 * @returns {IEnrichmentObject}
	 */
	function compute(raw_data: string[][]) {
		var data = Munge.munge(raw_data),
			enrichmentObj = {
				label: null,
				num_genes: data.labels.length
			},
			genes = data.labels.map(function(label, i) {
				return {
					label: label,
					cluster: data.clusters[i]
				};
			});
		for (var i=1; i<=6; i++) {
			let [log_odds, pval] = Analysis.clusterEnrichment(genes, i);
			enrichmentObj[ clusterToStage[i-1] ] = {
				log_odds: log_odds,
				pval: pval
			};
		}
		return enrichmentObj;
	}
	
	/**
	 * Print the name of each cluster for which the input is enriched
	 * @param enrichmentObj {IEnrichmentObject} enrichment object from analysis
	 * @returns {void}
	 */
	function printSignificant(enrichmentObj): void {
		for (var c in clusterToStage) {
			let cluster = clusterToStage[c];
			if (enrichmentObj[ cluster ].pval != null && enrichmentObj[ cluster ].pval <= 0.05) {
				process.stdout.write(`\x1b[32m \t Enriched for ${cluster} \x1b[0m \n`);
			}
		}
	}
}

export = ClusterEnrichment;
