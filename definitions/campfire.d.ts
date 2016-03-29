/* Definitions for the extensions to Window created for the campfire
 *
 * Definitions by Matt Poegel (https://github.com/mpoegel)
 */

/// <reference path="../typings/d3/d3.d.ts"/>

interface Window {
  d3select: (selector: string) => d3.Selection<any>
}
