import express = require('express');
let router = express.Router();

import analysis = require('./analysis');
import list = require('./list');
import matrix = require('./matrix');

router.use('/api/v1/analysis', analysis);
router.use('/api/v1/list', list);
router.use('/api/v1/matrix', matrix);

router.use((err: any, req, res, next) => {
	console.error(err);
	res.status(500).send('something broke :(');
});

export = router;
