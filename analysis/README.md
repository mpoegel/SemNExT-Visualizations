# Analysis CLI

The Analysis CLI is useful for computing enrichment data programmatically and/or en masse. This CLI
is bundled in this repository because it shares the codebase of the SWOT clock web interface.

To use the CLI, first compile the typescript and then run `node main.js` (assuming you are in the
`analysis` subdirectory). With no options or with the `--help` flag, the commands and options are
displayed.

## Quick Help
Result from running `node main.js --help`
```
<command> [options]                                                             
                                                                                
Commands:                                                                       
  enrichment  Run enrichment analysis                                           
  filter      Filter an input list of genes                                     
                                                                                
Options:                                                                        
  --type, -t               input type      [string] [choices: "disease", "kegg"]
  --input, --in            input file name                              [string]
  --output, --out          output file name                             [string]
  --sort, -s               sort the output by the given key             [string]
  --disease                run the analysis for a single input disease  [string]
  --kegg                   run the analysis for a single input KEGG pathway     
                                                                        [string]
  --out_format             output format                                        
                             [string] [choices: "csv", "json"] [default: "json"]
  --enrichment_type, --et  type of enrichment to use                            
                    [string] [choices: "fisher", "log_odds"] [default: "fisher"]
  --help                   Show help                                   [boolean]
                                                                                
```

## Long Help

There are two commands available from the CLI:
* `enrichment` and
* `filter`.

### `enrichment`
The `enrichment` command takes the input query, either a disease or a KEGG pathway, and determines
the clusters for which each is enriched. This can be done using either the fisher method or the
log odds method. The output can either be printed to the console as a table or piped to a file in
JSON or CSV format.

#### Example
```
$ node main.js enrichment --disease autism --et log_odds
=> Running cluster enrichment analysis...
 Completed Atypical autism.
 Completed Autism.
         Enriched for Pluripotency
         Enriched for Ectoderm
         Enriched for Cortical Specification
         Enriched for Upper Layers
 Completed Autism spectrum disease.
         Enriched for Pluripotency
         Enriched for Ectoderm
         Enriched for Cortical Specification
         Enriched for Upper Layers
=> Log Odds Table
Label                   Pluripotency Ectoderm Neural Differentiation Cortical Specification Early Layers Upper Layers
Autism                  -0.907       -1.222   0.287                  0.554                  0.231        0.626
Autism spectrum disease -0.907       -1.222   0.287                  0.554                  0.231        0.626
Atypical autism         1.796        -0.468   0.078                  -0.083                 0.022        0.746
=> P-Value Table
Label                   Pluripotency Ectoderm Neural Differentiation Cortical Specification Early Layers Upper Layers
Autism                  0.001        0.001    0.252                  0.011                  0.357        0.001
Autism spectrum disease 0.001        0.001    0.252                  0.011                  0.357        0.001
Atypical autism         0.142        0.757    0.959                  0.956                  0.988        0.542
=> Done.
```

### `filter`
The `filter` command takes as input a list of genes from a file and writes to a file the subset of
genes that are in the SemNExT database. This requires both the `--in` and `--out` flags.

#### Example
```
$ node main.js filter --in test.in --out test.out
=> Running filter...
Filtered 2/5 input genes
=> Output written to file.
=> Done.
```
Contents of `test.in`:
```
ATP10A
DRD4
BADGENE
HTR2A
H1N1
```
Contents of `test.out`:
```
ATP10A
DRD4
HTR2A
```
