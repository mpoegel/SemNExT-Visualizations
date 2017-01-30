/// <reference path="../../typings/tsd.d.ts" />

import express = require('express');
import analysis = require('../helpers/analysis');
import bodyParser = require('body-parser');

let router = express.Router(),
    jsonParser = bodyParser.json(),
    urlencodedParser = bodyParser.urlencoded({ extended: false });

/**
 * Return the p-value obtained from fisher's exact test using the given contingency table
 */
router.post('/fisher_exact', urlencodedParser, (req, res) => {
  let n11 = parseInt(req.body.n11, 10),
      n12 = parseInt(req.body.n12, 10),
      n21 = parseInt(req.body.n21, 10),
      n22 = parseInt(req.body.n22, 10);
  let result = analysis.fisherExact(n11, n12, n21, n22);
  res.send(result + '');
});

export = router;
