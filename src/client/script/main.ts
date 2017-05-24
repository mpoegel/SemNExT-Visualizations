/**
 * main.ts
 * 
 * The main javascript file that is served to the client and initiates the 
 * user interface.
 */

import CHeM = require('./helpers/graph');
import UI = require('./helpers/ui');

import * as d3 from 'd3';

let margin = {top: 200, right: 160, bottom: 160, left: 160},
    width = 1160,
    height = 960,
    canvas = new CHeM.Canvas(d3.select('.chart'), margin, width, height),
    root_path = location.pathname;

UI.configure(canvas, root_path);
