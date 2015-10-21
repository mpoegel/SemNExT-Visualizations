/// <reference path="../../typings/tsd.d.ts" />

import express = require('express');
var router = express.Router();

router.use('/api/v1/list', require('./list'));
router.use('/api/v1/matrix', require('./matrix'));

router.use((err: any, req, res, next) => {
	console.error(err.stack);
	res.status(500).send('something broke :(');
});

export = router;