import * as _ from 'underscore';
import {jStat} from 'jstat';
import * as R from 'r-script';
import path = require('path');

/**
 * Wrapper namespace for analytical functions
 */
namespace Analysis {
  
  /**
   * Representation of a gene for analytics purposes.
   */
  interface Gene {
    label: string;
    cluster: number;
  }
  
  /**
   * Number of genes in each cluster
   */
  const ClusterTotals = [3504, 2612, 1641, 1889, 1724, 2695];
  
  /**
   * Calculate the contingency table of a given cluster in group compared to
   * the larger group.
   * @param {Gene[]} Group of genes that is being checked for enrichment 
   * (response variable 1)
   * @param {Gene[]} Group of genes that is being checked against (response
   * variable 2)
   * @param {number} Number of the cluster that is thought to be enriched
   * @returns {number[]} [n11, n12, n21, n22]
   */
  export function contingencyTable(enrichmentGroup: Gene[], enrichmentCluster: number): number[] 
  {
    /**
     * 						  In Enrichment Group		Not in Enrichment Group
     * In Gene Cluster		  		n11						n12
     * Not In Gene Cluster			n21						n22
     */
    let n11 = _.filter(enrichmentGroup, (gene: Gene) => {
        return gene.cluster === enrichmentCluster;
      }).length,
      n21 = _.filter(enrichmentGroup, (gene: Gene) => {
        return gene.cluster !== enrichmentCluster;
      }).length,
      n12 = ClusterTotals[enrichmentCluster-1],
      n22 = 0;
      ClusterTotals.forEach(function(val, index) {
        if (index !== enrichmentCluster-1) n22 += val;
      });
    if (n11 === 0 || n21 === 0 || n12 === 0 || n22 === 0) {
      n11 += 0.5;
      n21 += 0.5;
      n12 += 0.5;
      n22 += 0.5;
    }
    return [n11, n12, n21, n22];
  }
  
  
  /**
   * @deprecated See LogOdds and zTest. The analysis CLI still uses this function.
   * Calculate the enrichment of a subgroup using log odds.
   * @param {number} n11 in two-way contingency table
   * @param {number} n12 in two-way contingency table
   * @param {number} n21 in two-way contingency table
   * @param {number} n22 in two-way contingency table
   * @returns {number[]} [log odds, p value]
   */
  export function enrichment(n11: number, n12: number, n21: number, n22: number): number[] 
  {
    let odds_ratio = (n11 * n22) / (n12 * n21),
        log_odds = Math.log(odds_ratio),
        std_error = Math.sqrt(1/n11 + 1/n12 + 1/n21 + 1/n22),
        z_score = log_odds / std_error;
    let mu = 0,
        sigma = 1,
        pval = 2 * (1 - jStat.normal.cdf(Math.abs(z_score), mu, sigma));
    return [log_odds, pval];
  }


  /**
   * Calculate the logs odds of the contingency table
   */
  export function logOdds(n11: number, n12: number, n21: number, n22: number): number
  {
    let odds_ratio = (n11 * n22) / (n12 * n21);
    let log_odds = Math.log(odds_ratio);
    return log_odds;
  }

  
  /**
   * Calculate the p-value using the z-test
   */
  export function zTest(n11: number, n12: number, n21: number, n22: number): number
  {
    let log_odds = logOdds(n11, n12, n21, n22);
    let std_error = Math.sqrt(1/n11 + 1/n12 + 1/n21 + 1/n22);
    let z_score = log_odds / std_error;
    let mu = 0;
    let sigma = 1;
    let p_value = 2 * (1 - jStat.normal.cdf(Math.abs(z_score), mu, sigma));
    return p_value;
  }


  /**
   * Calculate the p-value of the contingency table using fisher's exact test
   */
  export function fisherExact(n11: number, n12: number, n21: number, n22: number): void
  {
    let res = R(path.join(__dirname, 'fishers_exact_enrichment_test.R'))
      .data(n11, n21, n12, n22)
      .callSync();
    return res;
  }
  
}

export = Analysis;