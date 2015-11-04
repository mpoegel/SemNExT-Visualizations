/// <reference path="./../../typings/tsd.d.ts" />

var _ = require('underscore'),
	jStat = require('jstat').jStat;

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
	 * Calculate the enrichment of a given cluster in group compared to the 
	 * larger group.
	 * @param {Gene[]} Group of genes that is being checked for enrichment 
	 * (response variable 1)
	 * @param {Gene[]} Group of genes that is being checked against (response
	 * variable 2)
	 * @param {number} Number of the cluster that is thought to be enriched
	 * @returns {number[]} [log odds, p value]
	 */
	export function clusterEnrichment(enrichmentGroup: Gene[],
									  enrichmentCluster: number): number[] {
		/**
		 * 						In Enrichment Group		Not in Enrichment Group
		 * In Gene Cluster				n11						n12
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
		return enrichment(n11, n21, n12, n22);
	}
	
	
	/**
	 * Calculate the enrichment of a subgroup using log odds.
	 * @param {number} n11 in two-way contingency table
	 * @param {number} n12 in two-way contingency table
	 * @param {number} n21 in two-way contingency table
	 * @param {number} n22 in two-way contingency table
	 * @returns {number[]} [log odds, p value]
	 */
	export function enrichment(n11: number, n12: number, n21: number, 
							   n22: number): number[] {
		let odds_ratio = (n11 * n22) / (n12 * n21),
			log_odds = Math.log(odds_ratio),
			std_error = Math.sqrt(1/n11 + 1/n12 + 1/n21 + 1/n22),
			z_score = log_odds / std_error;
		let mu = 0,
			sigma = 1,
			pval = 2 * (1 - jStat.normal.cdf(z_score, mu, sigma));
		return [log_odds, pval];
	}
	
}

export = Analysis;