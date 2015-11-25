/**
 * Main file for all additional analysis.
 * Run
 * 	node main.js --help
 * for usage options.
 */

/// <reference path="../typings/tsd.d.ts" />

import clusterEnrichment = require('./clusterEnrichment');

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
			demand: true,
			type: 'string',
			describe: 'output file name'
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
				fs.writeFile(argv.output, JSON.stringify(result, null, 2), (err) => {
					if (err) {
						process.stdout.write(`\x1b[31m => Could not write to file ${argv.output}. \x1b[0m \n`);
					}
					else {
						console.log('=> Done.');
					}
				});
			});
		});
	}
	else {
		console.log(yargs.help());
	}
})();