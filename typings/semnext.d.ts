/* Definitions for the SemNExT JSON-LD API
 *
 * Definitions by Matt Poegel (https://github.com/mpoegel)
 */

interface DiseaseObject {
	/*
	 * The @context attribute is defined by the JSON-LD specification
	 * and describes to semantic tools how to map the JSON content into
	 * a graph structure compatible with RDF. This element can be safely
	 * ignored by JSON clients.
	 */
	'@context': string;
	/*
	 * The @id attribute is defined by the JSON-LD specification and
	 * describes to semantic tools the URI that identifies the annotated
	 * object in the transformed RDF graph. This element can be safely
	 * ignored by JSON clients.
	 */
	'@id': string;
	/*
	 * Disease name.
	 */
	label: string;
}

interface KeggPathwayObject {
	/*
	 * The @context attribute is defined by the JSON-LD specification
	 * and describes to semantic tools how to map the JSON content into
	 * a graph structure compatible with RDF. This element can be safely
	 * ignored by JSON clients.
	 */
	'@context': string;
	/*
	 * The @id attribute is defined by the JSON-LD specification and
	 * describes to semantic tools the URI that identifies the annotated
	 * object in the transformed RDF graph. This element can be safely
	 * ignored by JSON clients.
	 */
	'@id': string;
	/*
	 * Description of the Kegg Pathway object
	 */
	label: string;
}

interface CustomObject {
	/*
	 * Comma deliminated string of gene symbols.
	 */
	'@id': string;
	/*
	 * Description of the Custom Object
	 */
	label: string;
}

interface NetworkObject {

}
