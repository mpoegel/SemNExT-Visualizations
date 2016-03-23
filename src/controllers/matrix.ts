/// <reference path="../../typings/tsd.d.ts" />

import express = require('express');
import semnext = require('../models/semnext');
import bodyParser = require('body-parser');
var router = express.Router(),
    jsonParser = bodyParser.json(),
    urlencodedParser = bodyParser.urlencoded({ extended: false });

router.post(RegExp('/disease'), urlencodedParser, (req, res) => {
	semnext.fetchDiseaseMatrix(req.body.id, (data) => {
		res.send(data);
	}, (error) => {
		res.status(500).send(error);
	});
});

router.post(RegExp('/kegg_pathways'), urlencodedParser, (req, res) => {
	semnext.fetchKeggPathwaysMatrix(req.body.id, (data) => {
		res.send(data);
	}, (error) => {
		res.status(500).send(error);
	});
});

router.post(RegExp('/custom'), urlencodedParser, (req, res) => {
	semnext.fetchCustomMatrix(req.body.id, (data) => {
		res.send(data);
	}, (error) => {
		res.status(500).send(error);
	});
});

export = router;