/// <reference path="../../typings/tsd.d.ts"/>
import request = require('request');
import _ = require('underscore');
import Buffer = require('buffer');


interface IErrorObj {
  name: string;
  message: string;
  code: number;
  verbose?: string;
}

interface IMatrixCallback {
  (error: IErrorObj, data: string[][]): any;
}

interface IListCallback {
  (error: IErrorObj, data: DiseaseObject[] | KeggPathwayObject[]): any;
}

const SemNExT_URLs = {
  disease_matrix: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_disease?disease=',
  diseases_list: 'https://semnext.tw.rpi.edu/api/v1/list_known_diseases',
  kegg_matrix: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_kegg_pathway?pathway=',
  kegg_list: 'https://semnext.tw.rpi.edu/api/v1/list_known_kegg_pathways',
  custom_matrix: 'https://semnext.tw.rpi.edu/api/v1/matrix_for_genes?symbols='
}

const MAX_URI_SIZE = 8203;

/**
 * Fetch the matrix of data for the given disease. Wrapper for fetchMatrix.
 * @param diseaseId {string} the ID of the disease to fetch
 * @param callback {IMatrixCallback} function to call upon completion with the
 *  data on success or an error on failure
 * @returns {void}
 */
export function fetchDiseaseMatrix(diseaseId: string, callback: IMatrixCallback)
  :  void 
{
  fetchMatrix(SemNExT_URLs.disease_matrix, diseaseId, callback);
}

/**
 * Fetch the matrix of data for the given Kegg pathway. Wrapper for fetchMatrix.
 * @param keggId {string} the ID of the KEGG pathway to fetch
 * @param callback {IMatrixCallback} function to call upon completion with the
 *  data on success or an error on failure
 * @returns {void}
 */
export function fetchKeggPathwaysMatrix(keggId: string, callback: 
  IMatrixCallback):  void
{
  fetchMatrix(SemNExT_URLs.kegg_matrix, keggId, callback);
}

/**
 * Fetch the matrix of data for the given list of inputs. Wrapper for
 *  fetchMatrix.
 * @param inputs {string} comma deliminated string of input transcriptomes
 * @param callback {IMatrixCallback} function to call upon completion with the
 *  data on success or an error on failure
 * @returns {void}
 */
export function fetchCustomMatrix(inputs: string, callback: IMatrixCallback): 
  void 
{
  fetchMatrix(SemNExT_URLs.custom_matrix, inputs, callback);
}

/**
 * Fetch the matrix of data at the given location for the given object
 * @param url {string} path from which to retrieve the matrix
 * @param id {string} matrix identifier
 * @param callback {IMatrixCallback} function to call upon completion with the 
 *  data on success or an error on failure
 * @returns {void}
 */
function fetchMatrix(url: string, id: string, callback: IMatrixCallback): void 
{
  /* There apears to be a bug in nginx where it does not attach all the 
     necessary headers when it returns 414 error for the URI being too long.
     Since the Request module is very strict, it always expects a properly
     formed response header, otherwise it will throw an HPE_INVALID_CONSTANT 
     error. Therefore we must catch this error before it happens. */
  let uri = url + id;
  let uri_size = Buffer.Buffer.byteLength(uri, 'utf8');
  if (uri_size > MAX_URI_SIZE) {
    let err: IErrorObj = {
      name: 'URI Too Long',
      message: 'The length of the requested URI exceeds the buffer size.',
      code: 414
    }
    callback(err, null);
    return;
  }
  request.get(uri, function(error, response, body: string) {
    if (error || response.statusCode >= 400) {
      let err: IErrorObj = {
        name: 'Internal Error',
        message: 'Internal Error',
        code: 500
      };
      if (error) {
        console.log(error);
        err.name = 'Internal API Error';
        err.message = error;
      } else {
        err.name = 'SemNExT API Error';
        err.message = 'Server returned status code ' + response.statusCode;
        err.code = response.statusCode;
        err.verbose = body;
      }
      callback(err, null);
    } else {
      callback(null, _.map(body.split('\n'), (d) => {
        return d.split(',');
      }));
    }
  });
}

/**
 * Fetch the entire list of diseases in the database
 * @param callback {IListCallback} function to call upon completion with the 
 *  data on success or an error on failure
 * @returns {void}
 */
export function fetchDiseaseList(callback: IListCallback): void 
{
  request.get(SemNExT_URLs.diseases_list, function(error, response, body) {
    if (error || response.statusCode >= 400) {
      let err: IErrorObj = {
        name: 'Internal Error',
        message: 'Internal Error',
        code: 500
      };
      if (error) {
        console.log(error);
        err.name = 'Internal API Error';
        err.message = error;
      } else {
        err.name = 'SemNExT API Error';
        err.message = 'Failed to retrieve disease object list from the API. ' +
         'Server returned status code ' + response.statusCode;
        err.code = response.statusCode;
        err.verbose = body;
      }
      callback(err, null);
    } else {
      callback(null, JSON.parse(body));
    }
  });
}

/**
 * Fetch the entire list of KEGG pathways in the database
 * @param callback {IListCallback} function to call upon completion with the 
 *  data on success or an error on failure
 * @returns {void}
 */
export function fetchKeggPathwaysList(callback: IListCallback): void 
{
  request.get(SemNExT_URLs.kegg_list, function(error, response, body) {
    if (error || response.statusCode >= 400) {
      let err: IErrorObj = {
        name: 'Internal Error',
        message: 'Internal Error',
        code: 500
      };
      if (error) {
        console.log(error);
        err.name = 'Internal API Error';
        err.message = error;
      } else {
        err.name = 'SemNExT API Error';
        err.message = 'Failed to retrieve KEGG Pathway object list from the '
          'API. Server returned status code ' + response.statusCode;
        err.code = response.statusCode;
        err.verbose = body;
      }
      callback(err, null);
    } else {
      callback(null, JSON.parse(body));
    }
  });
}

/**
 * Search for the given disease in the database. Calls the callback function
 *  with a list of DiseaseObjects that match the query. Wrapper for findObject
 * @param disease {string} disease search query
 * @param callback {IListCallback} function to call upon completion with the 
 *  data on success or an error on failure
 * @returns {void}
 */
export function findDisease(disease: string, callback: IListCallback): void {
  findObject(SemNExT_URLs.diseases_list, disease, callback);
}

/**
 * Search for the given KEGG pathway in the database. Calls the callback 
 *  function with a list of KeggPathwayObjects that match the query. Wrapper 
 *  for findObject
 * @param pathway {string} KEGG pathway search query
 * @param callback {IListCallback} function to call upon completion with the 
 *  data on success or an error on failure
 * @returns {void}
 */
export function findKeggPathway(pathway: string, callback: IListCallback): void 
{
  findObject(SemNExT_URLs.diseases_list, pathway, callback);  
}

/**
 * Search for the given query at the given url endpoint.
 * @param url {string} URL path from which to find the input
 * @param query {string} search query 
 * @param callback {IListCallback} function to call upon completion with the 
 *  data on success or an error on failure
 * @returns {void}
 */
function findObject(url: string, query: string, callback: IListCallback):
  void
{
  let uri = url + '?q=' + query;
  request.get(uri, function(error, response, body) {
    if (error || response.statusCode >= 400) {
      let err: IErrorObj = {
        name: 'Internal Error',
        message: 'Internal Error',
        code: 500
      };
      if (error) {
        console.log(error);
        err.name = 'Internal API Error';
        err.message = error;
      } else {
        err.name = 'SemNExT API Error';
        err.message = 'Server returned status code ' + response.statusCode;
        err.code = response.statusCode;
        err.verbose = body;
      }
      callback(err, null);
    } else {
      callback(null, JSON.parse(body));
    }
  });
}
