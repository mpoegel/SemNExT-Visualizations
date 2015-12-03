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
			demand: true,
			type: 'string',
			describe: 'input type',
			choices: ['disease', 'kegg']
		})
		.option('input', {
			alias: 'in',
			demand: true,
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
		.demand(1)
		.help('help')
		.argv,
	fs = require('fs');

/**
 * Main function that always excecutes when the script is run that contains
 * the command logic.
 */
(function() {
	let command = argv._[0];
	if (command === 'enrichment') {
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
						result = utils.sort(result, argv.sort);
						utils.tabulate(result, ['label', argv.sort], console.log);
					}
					catch (e) {
						process.stdout.write(`\x1b[31m=> Sort failed: ${e.message}. \x1b[0m \n`);
					}
				}
				
				console.log('=> Done.');
			});			
		});
	}
	else {
		console.log(yargs.help());
	}
})();