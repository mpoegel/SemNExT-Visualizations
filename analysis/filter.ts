/**
 * Filtering module
 */

/// <reference path="../typings/tsd.d.ts" />

import Semnext  = require('../src/models/semnext');

var _ = require('underscore');

module Filter {
  export function valid(input: string[], callback): void {
    let promises = [];
    for (var i in input) {
      (function(gene) {
        promises.push(new Promise((resolve, reject) => {
          Semnext.fetchCustomMatrix(input[i], () => {
            resolve( gene );
          }, () => {
            resolve();
          });
        }));
      })(input[i]);
    }
    Promise.all(promises).then((result) => {
      callback(result);
    });
  }
}

export = Filter;
