import express = require('express');
import semnext = require('../models/semnext');
import bodyParser = require('body-parser');

let router = express.Router();
let jsonParser = bodyParser.json();
let urlencodedParser = bodyParser.urlencoded({ extended: false });

/**
 * Endpoint to request the data matrix for the given disease ID
 */
router.post(RegExp('/disease'), urlencodedParser, (req, res) => {
  semnext.fetchDiseaseMatrix(req.body.id, (error, data) => {
    if (error) {
      res.status(error.code)
         .send(error);
    } else {
      res.send(data);      
    }
  });
});

/**
 * Endpoint to request the data matrix for the given KEGG Pathway ID
 */
router.post(RegExp('/kegg_pathways'), urlencodedParser, (req, res) => {
  semnext.fetchKeggPathwaysMatrix(req.body.id, (error, data) => {
    if (error) {
      res.status(error.code)
         .send(error);
    } else {
      res.send(data);
    }
  });
});

/**
 * Endpoint to request the data matrix for a custom list of transcriptomes
 */
router.post(RegExp('/custom'), urlencodedParser, (req, res) => {
  semnext.fetchCustomMatrix(req.body.id, (error, data) => {
    if (error) {
      res.status(error.code)
         .send(error);
    } else {
      res.send(data);
    }
  });
});

export = router;
