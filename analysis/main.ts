/**
 * Main file for all additional analysis.
 * Run
 * 	node main.js --help
 * for usage options.
 */

/// <reference path="../typings/tsd.d.ts" />

import clusterEnrichment = require('./clusterEnrichment');
import utils = require('./utils');

var yargs = require('yargs'),
	argv = yargs
		.usage('Usage: $0 <command> [options]')
		.command('enrichment', 'Run enrichment analysis')
		.option('type', {
			alias: 't',
			demand: false,
			type: 'string',
			describe: 'input type',
			choices: ['disease', 'kegg']
		})
		.option('input', {
			alias: 'in',
			demand: false,
			type: 'string',
			describe: 'input file name'
		})
		.option('output', {
			alias: 'out',
			demand: false,
			type: 'string',
			describe: 'output file name'
		})
		.option('sort', {
			alias: 's',
			demand: false,
			type: 'string',
			describe: 'sort the output by the given key'
		})
		.option('disease', {
			demand: false,
			type: 'string',
			describe: 'run the analysis for a single input disease'
		})
		.option('kegg', {
			demand: false,
			type: 'string',
			describe: 'run the analysis for a single input KEGG pathway'
		})
		.demand(1)
		.help('help')
		.argv,
	fs = require('fs'),
	_ = require('underscore');

/**
 * Main function that always excecutes when the script is run that contains
 * the command logic.
 */
(function() {
	let command = argv._[0];
	if (command === 'enrichment') {
		if (argv.input) {
			fs.readFile(argv.input, 'utf8', function (err, raw_data) {
				if (err) {
					process.stderr.write(`Could not open file: ${argv.input}\n`);
					return;
				}
				let data = raw_data.split('\n');
				data = data.map((d) => { return d.replace('\r', ''); }); 
				console.log('=> Running cluster enrichment analysis...');
				clusterEnrichment.run(data, argv.type, (result) => {
					if (argv.output) {
						fs.writeFile(argv.output, JSON.stringify(result, null, 2), (err) => {
							if (err) {
								process.stdout.write(`\x1b[31m=> Could not write to file ${argv.output}. \x1b[0m \n`);
							}
							else {
								console.log('=> Output written to file.');
							}
						});
					}
					if (argv.sort) {
						console.log(`=> Sorting by: ${argv.sort}`);
						try {
							let sort_key = argv.sort.split('.'),
								stage = _.indexOf(clusterEnrichment.clusterToStage, sort_key[0]);
							if (stage === -1) {
								throw new Error(`Not a valid cluster: ${sort_key}`);
							}
							sort_key[0] = 'data[' + stage + ']';
							result = utils.sort(result, sort_key.join('.'));
							utils.tabulate(result, ['label', sort_key.join('.')], console.log);
						}
						catch (e) {
							process.stdout.write(`\x1b[31m=> Sort failed: ${e.message}. \x1b[0m \n`);
						}
					}
					
					console.log('=> Done.');
				});			
			});
		}
		else if (argv.disease || argv.kegg) {
			console.log('=> Running cluster enrichment analysis...');
			let input = [argv.disease || argv.kegg],
				type = (argv.disease ? 'disease' : 'kegg');
			clusterEnrichment.run(input, type, (result) => {
				if (result.length == 0) {
					console.log('=> Done.');
					return;
				}
				if (argv.output) {
					fs.writeFile(argv.output, JSON.stringify(result, null, 2), (err) => {
						if (err) {
							process.stdout.write(`\x1b[31m=> Could not write to file ${argv.output}. \x1b[0m \n`);
						}
						else {
							console.log('=> Output written to file.');
							console.log('=> Done.');
						}
					});
				}
				else {
					utils.tabulate(result, clusterEnrichment.clusterToStage.map(function(stage) { return 'data[' }), console.log);
					console.log('=> Done.');
				}				
			});
		}
		else {
			console.log(yargs.help());
		}
	}
	else {
		console.log(yargs.help());
	}
})();