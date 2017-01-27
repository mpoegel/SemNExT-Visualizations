import express = require('express');
import _ = require('underscore');
import semnext = require('../models/semnext');
let router = express.Router();

/**
 * Endpoint to get the list of either diseases or KEGG Pathways that are in the
 *  database
 */
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
      return (cb) => {
        let error = {
          name: 'Bad Request',
          message: 'Invalid type requested',
          code: 400
        };
        cb(error, null);
      }
    }
  })()((error, data) => {
    if (error) {
      res.status(error.code).send(error);
    } else {
      res.send(data);
    }
  });
});

export = router;
