/**
 * Main file for all additional analysis.
 * Run
 * 	node main.js --help
 * for usage options.
 */

import clusterEnrichment = require('./clusterEnrichment');
import Filter = require('./filter');
import utils = require('./utils');

var yargs = require('yargs'),
  argv = yargs
    .usage('Usage: $0 <command> [options]')
    .command('enrichment', 'Run enrichment analysis')
    .command('filter', 'Filter an input list of genes')
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
    .option('out_format', {
      demand: false,
      type: 'string',
      describe: 'output format',
      default: 'json',
      choices: ['csv', 'json']
    })
    .option('enrichment_type', {
      alias: 'et',
      demand: false,
      type: 'string',
      describe: 'type of enrichment to use',
      default: 'fisher',
      choices: ['fisher', 'log_odds']
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
        let enricher = new clusterEnrichment.Enricher(argv.enrichment_type);
        enricher.run(data, argv.type, (result) => {
          if (argv.output) {
            let file_output = '';
            if (argv.out_format === 'csv') {
              file_output = createCSVFormat(result);
            } else {
              file_output = JSON.stringify(result, null, 2);
            }
            fs.writeFile(argv.output, file_output, (err) => {
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
      let enricher = new clusterEnrichment.Enricher(argv.enrichment_type);
      enricher.run(input, type, (result) => {
        if (result.length == 0) {
          console.log('=> Done.');
          return;
        }
        if (argv.output) {
          let file_output = '';
          if (argv.out_format === 'csv') {
            file_output = createCSVFormat(result);
          } else {
            file_output = JSON.stringify(result, null, 2);
          }
          fs.writeFile(argv.output, file_output, (err) => {
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
          utils.tabulate(result,
                         clusterEnrichment.clusterToStage.map(function(stage) {return 'data[' }),
                         console.log);
          console.log('=> Done.');
        }				
      });
    }
    else {
      console.log(yargs.help());
    }
  }
  else if (command === 'filter') {
    if (argv.input === undefined) {
      process.stderr.write(`Input file required.`);
      return;
    }
    if (argv.output === undefined) {
      process.stderr.write(`Output file required.`);
      return;
    }
    fs.readFile(argv.input, 'utf8', function (err, raw_data) {
      if (err) {
        process.stderr.write(`Could not open file: ${argv.input}\n`);
        return;
      }
      console.log('=> Running filter...');
      let input_list = raw_data.split('\n');
      input_list = input_list.map((d) => { return d.replace('\r', ''); });
      Filter.valid(input_list, (result) => {
        result = result.filter((d) => { return d; });
        console.log(`Filtered ${input_list.length-result.length}/${input_list.length} input genes`);
        let res_string = result.join('\n');
        fs.writeFile(argv.output, res_string, (err) => {
          if (err) {
            process.stdout.write(`\x1b[31m=> Could not write to file ${argv.output}. \x1b[0m \n`);
          }
          else {
            console.log('=> Output written to file.');
          }
          console.log('=> Done.');
        });
      });
    });
  }
  else {
    console.log(yargs.help());
  }
})();


/**
 * 
 */
function createCSVFormat(data): string {
  let file_output = '';
  file_output += 'label,num_genes,pluripotency log odds,pluripotency p value,' +
    'ectoderm log odds,ectoderm p value,neural differentiation log odds,' +
    'neural differentiation p value,cortical specification log odds,' +
    'cortical specification p value,early layers log odds, early layers p value,' +
    'upper layers log odds, upper layers p value\n';
  for (var i=0; i<data.length; i++) {
    file_output += data[i].label + ',' + data[i].num_genes + ','
    for (var k=0; k<data[i].data.length; k++) {
      file_output += data[i].data[k].log_odds + ',' + data[i].data[k].pval;
      if (k < data[i].data.length - 1) {
        file_output += ',';
      }
    }
    file_output += '\n';
  }
  return file_output;
}
