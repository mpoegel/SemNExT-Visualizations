/// <reference path="../typings/tsd.d.ts"/>
/// <reference path="./graph.ts"/>

namespace UI {

	let graph: CHeM.Graph,
			canvas: CHeM.Canvas,
			fade_opacity: number,
			dom_cluster: number;

	export function configure(c: CHeM.Canvas): void {
		canvas = c;
		attachListener();
		initDiseaseList();
	}

	function initDiseaseList(): void {
		Munge.fetchDiseaseList((diseaseObjs) => {
			$('#searchBox')
				.typeahead('destroy')
				.typeahead({
					hint: true,
					highlight: true,
					minLength: 1
				}, {
					name: 'disease-list',
					display: 'label',
					source: new Bloodhound({
						datumTokenizer: (datum) => { return [datum.label]; },
						queryTokenizer: Bloodhound.tokenizers.whitespace,
						local: diseaseObjs,
						identify: (obj) => { return obj['@id']; },
					})
				})
				.attr('placeholder', 'Search for a disease')
				.off('typeahead:select')
				.on('typeahead:select', (ev, diseaseObj) => {
					drawCompleteGraph(diseaseObj, 'disease');
				});
			$('.totalDiseases').text( diseaseObjs.length );
		});
	}

	function initKeggPathwayList(): void {
		Munge.fetchKeggPathwaysList((keggObjs) => {
			$('#searchBox')
				.typeahead('destroy')
				.typeahead({
					hint: true,
					highlight: true,
					minLength: 1
				}, {
					name: 'kegg-pathways-list',
					display: 'label',
					source: new Bloodhound({
						datumTokenizer: (datum) => { return [datum.label]; },
						queryTokenizer: Bloodhound.tokenizers.whitespace,
						local: keggObjs,
						identify: (obj) => { return obj['@id']; },
					})
				})
				.attr('placeholder', 'Search for a Kegg Pathway')
				.off('typeahead:select')
				.on('typeahead:select', (ev, keggObj) => {
					drawCompleteGraph(keggObj, 'kegg pathways');
				});
		});
	}

	export function drawCompleteGraph(semnextObj: DiseaseObject|KeggPathwayObject|CustomObject,
																		data_type: string): void {
		canvas.clear();
		$('.welcome-message').hide();
		$('.loading').show();
		(function() {
			if (data_type === 'disease')
				return Munge.fetchDiseaseMatrix;
			else if (data_type === 'kegg pathways')
				return Munge.fetchKeggPathwaysMatrix;
			else if (data_type === 'custom')
				return Munge.fetchCustomMatrix;
			else
				return _.noop;
		})()(semnextObj['@id'], (raw_data: string[][]) => {
			let data = Munge.munge(raw_data);
			data.title = semnextObj.label;
			$('.loading').hide();
			let g = new CHeM.Graph(data, canvas)
				.drawChords()
				.drawClusterBands()
				.drawTextLabels()
				.drawCircularHeatmap()
				.drawClusterLegend()
				.drawHeatmapLegend()
				.drawTitle();
			graph = g;
			fade_opacity = graph.getFadeOpacity();
			dom_cluster = graph.getData().domc;
		});
	}

	function attachListener(): void {
		$('.chart-btn').off('click').on('click', (e: Event) => {
			let action = $(e.target).attr('data-action');
			switch (action) {
				case 'highlight-none':
					clearHighlighting();
					break;
				case 'highlight-hover':
					setHighlightOnHover($(e.target));
					break;
				case 'highlight-click':
					setHighlightOnClick($(e.target));
					break;
				case 'highlight-dom':
					highlightDominantCluster();
					break;
				case 'display-all':
					displayAll();
					break;
				case 'display-none':
					displayNone();
					break;
				case 'display-invert':
					invertDisplay();
					break;
				case 'toggle-settings':
					toggleSettings($(e.target));
					break;
				case 'download-svg':
					downloadSVG();
					break;
				case 'download-png':
					downloadPNG();
					break;
				case 'show-legends':
					showLegends($(e.target));
					break;
				case 'hide-legends':
					hideLegends($(e.target));
					break;
				case 'custom-data':
					$('.custom-dataset-menu').toggle();
					break;
				case 'set-D310-colors':
					graph.recolor(CHeM.Graph.d3Cat10Colors);
					break;
				case 'set-matlab-colors':
					graph.recolor(CHeM.Graph.matlabColors);
					break;
				case 'path-color-gradient':
					graph.drawGradientPaths();
					break;
				case 'set-search-disease':
					setDiseaseSearch();
					break;
				case 'set-search-kegg-pathway':
					setKeggPathwaySearch();
					break;
				case 'create-custom':
					createCustomCHeM();
					break;
				case 'clear-custom-genes':
					$('.custom-dataset-menu textarea').val('');
					break;
			}
		});
		$('.custom-dataset-menu input[name="gene-file"]').off().on('change', (e: Event) => {
			let file = $(e.target)[0].files[0];
			if (file) {
				let reader = new FileReader(),
						$gene_list = $('.custom-dataset-menu textarea');
				reader.readAsText(file);
				reader.onload = function() {
					let raw_input = reader.result,
							genes = parseGeneInput(raw_input),
							gene_list = $gene_list.val();
					gene_list += gene_list ? '\n' + genes.join('\n') : genes.join('\n');
					$gene_list.val(gene_list);
				}
			}
		});
	}

	function clearHighlighting(): void {
		$('.highlight-btn').removeClass('active');
		canvas.getSVG().selectAll('g.group, .heatmap-arc, .cluster-arc')
			.on('mouseover', _.noop)
			.on('mouseout', _.noop)
			.on('click', _.noop);
	}

	function setHighlightOnHover(btn: JQuery): void {
		clearHighlighting();
		btn.addClass('active');
		canvas.getSVG().selectAll('g.group, .heatmap-arc')
			.on('mouseover', CHeM.getFader(canvas.getSelector(),
			 	fade_opacity))
			.on('mouseout', CHeM.getFader(canvas.getSelector(),
				1.00));
		canvas.getSVG().selectAll('cluster-arc')
			.on('mouseover', CHeM.getClusterFader(canvas.getSelector(),
				fade_opacity))
			.on('mouseout', CHeM.getClusterFader(canvas.getSelector(),
				fade_opacity));
	}

	function setHighlightOnClick(btn: JQuery): void {
		clearHighlighting();
		btn.addClass('active');
		canvas.getSVG().selectAll('g.group, .heatmap-arc')
			.on('click', CHeM.getToggleFader(canvas.getSelector(),
				fade_opacity));
		canvas.getSVG().selectAll('.cluster-arc')
			.on('click', CHeM.getToggleClusterFader(canvas.getSelector(),
				fade_opacity));
	}

	function highlightDominantCluster(): void {
		displayNone();
		canvas.getSVG().selectAll('path.chord, .chordMask')
			.filter((d) => {
				return d.source.cluster === dom_cluster ||
					d.target.cluster === dom_cluster;
			})
			.transition()
				.style('opacity', 1.0)
				.attr('visible', true);
	}

	function displayAll(): void {
		canvas.getSVG().selectAll('path.chord, .chordMask')
			.transition()
				.style('opacity', 1.0)
				.attr('visible', true);
	}

	function displayNone(): void {
		canvas.getSVG().selectAll('path.chord, .chordMask')
			.transition()
				.style('opacity', fade_opacity)
				.attr('visible', false);
	}

	function invertDisplay(): void {
		let hidden = canvas.getSVG()
					.selectAll('path.chord[visible=false], .chordMask[visible=false]'),
				visible = canvas.getSVG()
					.selectAll('path.chord[visible=true], .chordMask[visible=true]');
		hidden.transition()
			.style('opacity', 1.0)
			.attr('visible', true);
		visible.transition()
			.style('opacity', fade_opacity)
			.attr('visible', false);
	}

	function toggleSettings(btn: JQuery): void {
		let toggle: boolean = btn.attr('expanded') === 'true';
		if (toggle) {
			$('.expanded-settings-bar').slideUp();
			btn.attr('title', 'Show more settings.')
					.removeClass('fa-minus-square-o')
					.addClass('fa-plus-square-o');
		}
		else {
			$('.expanded-settings-bar').slideDown();
			btn.attr('title', 'Show less settings.')
					.removeClass('fa-plus-square-o')
					.addClass('fa-minus-square-o');
		}
		btn.attr('expanded', (! toggle) + '');
	}

	function getSVGSource(): string {
		return 'data:image/svg+xml;base64,' +
			btoa($('svg')
				.attr('version', 1.1)
				.attr('xmlns', 'http://www.w3.org/2000/svg')
				.parent().html());
	}

	function downloadSVG(): void {
		let a = document.createElement('a');
		a.download = graph.getData().title + '.svg';
		a.href = getSVGSource();
		a.click();
	}

	function downloadPNG(): void {
		let canvasElem = document.createElement('canvas');
		canvasElem.width = canvas.getWidth();
		canvasElem.height = canvas.getHeight();
		let context = canvasElem.getContext('2d'),
				image = new Image;
		image.src = getSVGSource();
		image.onload = () => {
			context.drawImage(image, 0, 0);
			let a = document.createElement('a');
			a.download = $('svg .title').text() + '.png';
			a.href = canvasElem.toDataURL('image/png');
			a.click();
		}
	}

	function hideLegends(btn?: JQuery): void {
		canvas.getSVG().select('.clusterLegend').remove();
		canvas.getSVG().select('.heatmapLegend').remove();
		if (btn) {
			btn.text('Show Legends')
					.attr('data-action', 'show-legends');
		}
	}

	function showLegends(btn?: JQuery): void {
		graph.drawClusterLegend()
				.drawHeatmapLegend();
		if (btn) {
			btn.text('Hide Legends')
					.attr('data-action', 'hide-legends');
		}
	}

	function createCustomCHeM(): void {
		let $geneBox = $('.custom-dataset-menu textarea'),
				title = $('.custom-dataset-menu input[name="custom-name"]').val(),
				raw_genes = $geneBox.val(),
				genes = parseGeneInput(raw_genes);
		let CustomObj: CustomObject = {
			'@id': genes.join(','),
			label: title
		}
		drawCompleteGraph(CustomObj, 'custom');
	}

	function parseGeneInput(raw_genes: string): string[] {
		let genes: string[] = [];
		genes = raw_genes.split(',');
		genes = _.flatten(_.map(genes, (gene) => {
			gene = gene.trim();
			return gene.split('\n');
		}));
		return genes;
	}

	function setDiseaseSearch(): void {
		initDiseaseList();
	}

	function setKeggPathwaySearch(): void {
		initKeggPathwayList();
	}

}
