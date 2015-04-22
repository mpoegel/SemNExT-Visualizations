# ==============================================================================
# Extract the neccesary data to create a chord diagram
#
# Matt Poegel
# 2-17-2014
# ==============================================================================
import sys
import json
import copy


def mapConnections(nodes, data_file):
	header = True
	for line in open(data_file):
		if (header):
			header = False
			continue
		line = line.strip().split(',')
		# if the gene has been seen before then append this new connection to
		# 	the existing structure
		if (line[0] == 'LDLCQ3' or line[1] == 'LDLCQ3'): continue
		if (line[0] in nodes):
			 nodes[line[0]][line[1]] = line[-1]
		# create a new structure for new genes
		else:
			nodes[line[0]] = {
				line[1]: line[-1]
			}
		# make sure all of the secondary nodes are captured in the grand list
		if (line[1] not in nodes):
			nodes[line[1]] = dict()
	return nodes

def mapGeneData(gene_info_filename):
	# extract the data from the gene data file
	gene_data = dict()
	header = True
	for line in open(gene_info_filename):
		if (header):
			header = False
			continue
		line = line.strip().split(',')
		gene_data[line[1]] = {
			'd0':  line[2],
			'd7':  line[3],
			'd12': line[4],
			'd19': line[5],
			'd26': line[6],
			'd33': line[7],
			'd49': line[8],
			'd63': line[9],
			'd77': line[10],
			'cluster': line[11],
			'autism': line[14],
			'holoprecencephaly': line[15],
			'microcephaly': line[16],
			'lissencephaly': line[17],
			'alzheimer': line[18],
			'tauopathy': line[19]

		}
	return gene_data

def fillHoles(genes, gene_data):
	# for any genes for which we do not have cluster and day data for, assign
	#	to cluster 7 and give blank day data
	for gene in genes:
		if (gene not in gene_data):
			gene_data[gene] = {
				'd0': '',
				'd7': '',
				'd12': '',
				'd19': '',
				'd26': '',
				'd33': '',
				'd49': '',
				'd63': '',
				'd77': '',
				'cluster': '7',
				'autism': '',
				'holoprecencephaly': '',
				'microcephaly': '',
				'lissencephaly': '',
				'alzheimers': '',
				'tauopathy': ''
			}
	return gene_data

def saveConnections(out_filename, nodes, gene_data):
	out_file = open(out_filename, "w")
	gene_data = fillHoles(nodes, gene_data)
	genes = sortByCluster(nodes, gene_data)
	# print a header
	for gene in genes:
		out_file.write(gene + ',')
	out_file.write('Cluster,')
	for day in DAYS:
		out_file.write(day + ',')
	out_file.write('\n')

	# print the connections for each gene
	for gene in genes:
		connections = nodes[gene]
		for g in genes:
			if (g in connections):
				out_file.write(connections[g] + ',')
			else:
				out_file.write('0,')
		# print the cluster information for each gene
		out_file.write(gene_data[gene]['cluster'] + ',')
		# print the heatmap data day by day
		for day in DAYS:
			out_file.write(gene_data[gene][day] + ',')
		out_file.write('\n')
	out_file.close()

def sortByCluster(nodes, gene_data):
	# sort the genes by cluster and then by alphabetical order
	genes = nodes.keys()
	sorted_genes = []
	num_clusters = max([int(x['cluster']) for x in gene_data.values()])
	for i in range(num_clusters+1):
		this_cluster = []
		for gene in genes:
			if (int(gene_data[gene]['cluster']) == i):
				this_cluster.append(gene)
		this_cluster = sorted(this_cluster)
		sorted_genes.extend(this_cluster)
	return sorted_genes

def printConnectionsCount(node):
	genes = sorted(nodes.keys())
	# count the connections of each gene for verification
	for gene in genes:
		count = 0
		connections = nodes[gene]
		for g in genes:
			if (g in connections):
				count += 1
		print(gene + ": " + str(count))

def saveHeatMapData(heatmap_filename, nodes, gene_data):
	genes = sortByCluster(nodes, gene_data)
	out_file = open(heatmap_filename, "w")
	# Print a header
	out_file.write("Gene_Symbol,Day,Value,Cluster\n")
	for gene in genes:
		for day in ['d0','d7','d12','d19','d26','d33','d49','d63','d77']:
			out_file.write(gene + ',' + day + ',' + gene_data[gene][day] +
				',' + gene_data[gene]['cluster'] + '\n')
	out_file.close()

def getGeneDescriptions(gene_descr_filename):
	desc = dict()
	for line in open(gene_descriptions_filename):
		line = line.strip().split('\t')
		desc[line[0]] = line[2].strip('"')
	return desc

def captureSemanticData(genes, gene_data, gene_desc, connections):
	semData = dict()
	# add the information from gene_data and gene_desc
	for gene in genes:
		semData[gene] = dict()
		semData[gene]['Days'] = dict()
		for d in DAYS:
			semData[gene]['Days'][d] = float(gene_data[gene][d])
		semData[gene]['Relations'] = dict()
		for d in DISEASES[:6]:
			semData[gene]['Relations'][d] = (gene_data[gene][d] == 'yes')
		if (gene in gene_desc):
			semData[gene]['Description'] = gene_desc[gene]
		else:
			semData[gene]['Description'] = ''
		semData[gene]['Outgoing'] = dict()
		semData[gene]['Incoming'] = dict()
	# add all the information on the connections
	header_flag = False
	for line in open(connections):
		line = line.strip().split(',')
		if (not header_flag):
			header_flag = True
		else:
			gene1 = line[0]
			gene2 = line[1]
			link = {
				'neighborhood': float(line[6]),
				'fusion': float(line[7]),
				'cooccurence': float(line[8]),
				'homology': float(line[9]),
				'coexpression': float(line[10]),
				'experimental': float(line[11]),
				'knowledge': float(line[12]),
				'textmining': float(line[13]),
				'combined score': float(line[14])
			}
			semData[gene1]['Outgoing'][gene2] = link
			semData[gene2]['Incoming'][gene1] = link

	return semData


def saveGenes(genes_filename, nodes):
	out_file = open(genes_filename, "w")
	for gene in nodes.keys():
		out_file.write(gene + "\n")
	out_file.close()

# ------------------------------------------------------------------------------
if (__name__ == '__main__'):

	DISEASES = ['alzheimer', 'autism', 'holoprecencephaly', 'lissencephaly',
		'microcephaly', 'tauopathy', 'WBSsymmetrical', 'WBShighlyLinear',
		'WilliamsBeurenSyndrome']
	DAYS = ['d0','d7','d12','d19','d26','d33','d49','d63','d77']

	db = dict()

	gene_info_filename = "data/GeneClockData.csv"
	# create a map of all the individual gene data
	gene_data = mapGeneData(gene_info_filename)

	for disease in DISEASES:

		disease = DISEASES[1]

		print(disease + "... ", end="")
		# input file names
		connections_filename = "data/" + disease + "_data.csv"
		gene_descriptions_filename = "data/" + disease + "_gene_descriptions.txt"
		# output file names
		chord_filename = "data/" + disease + "_chord_data.csv"
		heatmap_filename = "data/" + disease + "_heatmap_data.csv"
		genes_filename = "data/" + disease + "_gene_list.csv"
		semantic_json_filename = "data/" + disease + "_semantic.json"

		# create a map of all the connections between the genes
		nodes = dict()
		mapConnections(nodes, connections_filename)
		mapConnections(db, connections_filename)

		# the connections as a matrix to a file
		saveConnections(chord_filename, nodes, gene_data)
		# print the number of connections for each gene (debug)
		# printConnectionsCount(nodes)
		saveHeatMapData(heatmap_filename, nodes, gene_data)
		# print a list of all the genes related to the disease
		saveGenes(genes_filename, nodes)
		# save the semantic data
		gene_desc = getGeneDescriptions(gene_descriptions_filename)
		semData = captureSemanticData(nodes.keys(), gene_data, gene_desc,
			connections_filename)
		sem_json = open(semantic_json_filename, 'w')
		sem_json.write( json.dumps(semData, indent=2) )

		print("Done")
		break

	if (len(sys.argv) > 1):
		file_name = sys.argv[1]
		print('Creating data for ', file_name, end='...')
		out_name = file_name + "_chord_data.csv"
		out_file = open(out_name, 'w')

		nodes = dict()
		for gene in open(file_name):
			gene = gene.strip()
			if (gene in db):
				nodes[gene] = db[gene]
			else:
				print("ERR: missing gene: ", gene)

		saveConnections(out_name, nodes, gene_data)
		print("done")
