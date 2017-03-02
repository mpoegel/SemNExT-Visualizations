import Analysis = require('../src/helpers/analysis');
import Munge    = require('../src/helpers/munge');
import Semnext  = require('../src/models/semnext');

import * as _ from 'underscore';

/**
 * Utility module that contains abstracted helper functions
 */
module Utils {
  
  /**
   * Put the input list into a table, calling the function 'print' with
   * 	every row
   * @param list {{}[]} input array of objects to tabulate
   * @param keys {string[]} array of properties for each column (can be 
   * 	deep properties)
   * @param print {(string) => any} function to call with each row string 
   * @param col_names {string[]} list of names for each column
   * @returns {void} 
   */
  export function tabulate(list: {}[], keys: string[], print: (string) => any, col_names?: string[])
    : void
  {
    const ROUND = 1000;
    let lines = [];
    lines.push(col_names);
    let col_widths = [];
    for (var k in keys) {
      let w = 0;
      for (var i in list) {
        let val = getDeepProperty(list[i], keys[k]);
        let this_w;
        if (typeof(val) === 'string') {
          this_w = val.length;
        }
        else if (typeof(val) === 'number') {
          this_w = (Math.round(val * ROUND) / ROUND).toString().length;
        }
        else if (typeof(val) === 'object' && val.join !== undefined) {
          this_w = val.join(', ').length;
        }
        else {
          throw new Error(`Cannot stringify property value for: ${keys[k]}.
            Object is of type: ${typeof(val)}`);
        }
        if (this_w > w) {
          w = this_w;
        }
      }
      col_widths.push(w);
    }
    for (let c in col_names) {
      if (col_widths[c] < col_names[c].length) {
        col_widths[c] = col_names[c].length;
      }
    }
    for (var i in list) {
      let line = [];
      for (var k in keys) {
        try {
          let val = getDeepProperty(list[i], keys[k]);
          line.push(val);
        }
        catch (e) {
          throw e; 
        }
      }
      lines.push(line);
    }
    for (let i in lines) {
      let line = ''
      for (let k in lines[i]) {
        let e = lines[i][k];
        if (typeof(e) === 'number') {
          e = (Math.round(e * ROUND) / ROUND).toString();
        }
        while (e.length < col_widths[k]) e += ' ';        
        line += e + ' ';
      }
      print(line);
    }
  }
  
  
  export function tabulate2(list: any[]): void {
    
  }
  
  
  /**
   * Sort the input array of objects by the given property (can be a 
   * 	deep property)
   * @param list {{}[]} input array to sort
   * @param key {string} property to sort by (can be a deep property)
   * @returns {{}[]} sorted array
   */
  export function sort(list: {}[], key: string): any[] {		
    return _.sortBy(list, (obj) => { return getDeepProperty(obj, key); });
  }
  
  /**
   * Finds and returns a deep property in an object. A deep property does
   * 	not have to be in the top layer of the input. Use a period to 
   * 	delineate deeper properties: foo.bar.fizz
   * @param obj {{}} object to search
   * @param key {string} deep property name 
   * @returns {any} value of the deep property
   */
  function getDeepProperty(obj: {}, key: string): any {
    let params = key.split('.');
    for (var p in params) {
      if (params[p].search(/[\d*]/) !== -1) {
        let i = +params[p].match(/[\d*]/)[0];
        let list = params[p].split('[')[0];
        obj = obj[list][i];
      }
      else if (obj[params[p]] === undefined) {
        throw new Error(`Key "${key}" not found in object list`);
      }
      else {
        obj = obj[params[p]];
      }
    }
    return obj;
  }
  
  /**
   * 
   */
  function deepGroupBy(list: any[], keys: string[]): any {
    let result = _.map(list, (obj) => {
      let inter_res = [];
      
    });
    return result;
  }
  
}

export = Utils;
