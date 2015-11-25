/// <reference path="../../../typings/tsd.d.ts"/>

import CHeM = require('./helpers/graph');
import UI = require('./helpers/ui');

let margin = {top: 180, right: 160, bottom: 160, left: 160},
		width = 960,
		height = 960,
		canvas = new CHeM.Canvas(d3.select('.chart'), margin, width, height),
		root_path = location.pathname;

UI.configure(canvas, root_path);
