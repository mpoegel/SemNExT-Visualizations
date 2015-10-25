// Type definitions for jstat 1.4.6
// Project: https://github.com/jstat/jstat
// Definitions by: Matt Poegel <https://github.com/mpoegel/>

interface jStatStatic {
	
	/**
	 * Defines methods on a Normal Distribution.
	 */
	normal: Distribution;
	
}

interface Distribution {
	/**
	 * Returns the value of x in the pdf of the distribution with 
	 * parameters mean and std (standard deviation).
	 */
	pdf: (x: number, mean: number, std: number) => number;
	/**
	 * Returns the value of x in the cdf of the distribution with 
	 * parameters mean and std (standard deviation).
	 */
	cdf: (x: number, mean: number, std: number) => number;
}

declare var jStat: jStatStatic;