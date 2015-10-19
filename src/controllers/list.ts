/// <reference path="../../typings/tsd.d.ts" />

import express = require('express');
import _ = require('underscore');
import semnext = require('../models/semnext');
var router = express.Router();

router.get('/:type', (req, res) => {
	let t = req.params.type;
	(() => {
		if (t === 'disease') {
			return semnext.fetchDiseaseList;
		}
		else if (t === 'kegg_pathways') {
			return semnext.fetchKeggPathwaysList;
		}
		else {
			return (cb, onError) => {
				let error = new Error('Invalid type');
				error.name = 'Bad Request';
				onError(error, 400);
			}
		}
	})()((data) => {
		res.send(data);
	}, (error, code = 500) => {
		res.status(code).send(error);
	});
});

export = router;