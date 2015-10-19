/// <reference path="../../typings/tsd.d.ts" />

import express = require('express');
import semnext = require('../models/semnext');
var router = express.Router();

router.get(RegExp('/disease/(.*)'), (req, res) => {
	semnext.fetchDiseaseMatrix(req.query.id, (data) => {
		res.send(data);
	}, (error) => {
		res.status(500).send(error);
	});
});

router.get(RegExp('/kegg_pathways/(.*)'), (req, res) => {
	semnext.fetchKeggPathwaysMatrix(req.query.id, (data) => {
		res.send(data);
	}, (error) => {
		res.status(500).send(error);
	});
});

router.get(RegExp('/custom/(.*)'), (req, res) => {
	semnext.fetchCustomMatrix(req.query.id, (data) => {
		res.send(data);
	}, (error) => {
		res.status(500).send(error);
	});
});

export = router;