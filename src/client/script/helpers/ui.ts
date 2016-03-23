/// <reference path="./../../../../typings/tsd.d.ts"/>
/**
 * ui.ts
 * 
 * Adds the interactivity to the user interface (i.e. buttons, input, etc.)
 */
import Munge = require('./../../../helpers/munge');
import Analysis = require('./../../../helpers/analysis');
import CHeM = require('./graph');

var $ = require('jquery'),
    _ = require('underscore'),
   typeahead = require('typeahead.js-browserify'),
   Bloodhound = require("typeahead.js-browserify").Bloodhound;

window.jQuery = $;
require('bootstrap');

/**
 * The namespace that contains all functions related to the user interface.
 */
namespace UI {

  let graph: CHeM.Graph,
      canvas: CHeM.Canvas,
      root_path: string,
      fade_opacity: number,
      dom_cluster: number;

  const colors = {
      critical: '#F77',
      warning: '#DC3',
      info: '#3CD'
    },
    MIN_GRAPH_SIZE = 5;

  /** 
   * Initializes the necessary components in the UI.
   * @param c {CHeM.Canvas} the canvas on which the diagrams will be drawn
   * @param p {string} the root path for the application
   * @returns {void}
   */
  export function configure(c: CHeM.Canvas, p: string): void 
  {
    canvas = c;
    root_path = p;
    typeahead.loadjQueryPlugin();
    attachListener();
    initDiseaseList();
  }
  
  /**
   * Handler function to display error messages to the user.
   * @param error {Error} the error object to handle
   * @param errorLevel {string} one of 'critical', 'warning' or 'info'
   * @param dismissable {boolean} whether or not the user can dismiss the 
   *  notification
   * @returns {void}
   */
  function errorHandler(error: Error, errorLevel: string, dismissable: boolean)   : void 
  {
    $('.loading').hide();
    let $existing_bars = $('.error-bar');
    _.each($existing_bars, (bar) => {
      if ($(bar).find('.title').text() === error.name) {
        $(bar).remove();
        return;
      }
    });
    let $error_bar = $('<div/>', {
        class: 'error-bar chart-btn',
        'data-action': dismissable ? 'close-error' : ''
      })
      .append($('<span/>', {
        class: 'text'
      }))
      .css({
        'background-color': colors[errorLevel],
        'cursor': dismissable ? 'pointer' : 'default'
      })
      .appendTo('.error-bar-bin');
    $error_bar.find('.text')
      .append($('<b/>', {
        class: 'title',
        text: error.name
      }))
      .append('<span>. </span>')
      .append($('<span/>', {
        class: 'body',
        html: error.message
      }));
  }
  
  /**
   * Initialize the list of diseases using Typeahead for autocomplete.
   * @returns {void}
   */
  function initDiseaseList(): void 
  {
    $.get(root_path + 'api/v1/list/disease')
      .done((diseaseStr) => {
        let diseaseObjs = JSON.parse(diseaseStr),
          bloodhound = new Bloodhound({
            datumTokenizer: (datum) => { return [datum.label]; },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: () => { return diseaseObjs; },
            identify: (obj) => { return obj['@id']; },
          });
        $('#searchBox')
          .typeahead('destroy')
          .typeahead({
            hint: true,
            highlight: true,
            minLength: 1
          }, {
              name: 'disease-list',
              display: 'label',
              source: bloodhound
            })
          .attr('placeholder', 'Search for a disease')
          .off('typeahead:select')
          .on('typeahead:select', (ev, diseaseObj) => {
            drawCompleteGraph(diseaseObj, 'disease');
          });
        $('.totalDiseases').text(diseaseObjs.length);
      })
      .fail((error) => {
        let e = new Error(error.statusText);
        e.name = error.status;
        errorHandler(e, 'critical', false);
      });
  }
  
  /** 
   * Initialize the list of KEGG Pathways using Typeahead for autocomplete.
   * @returns {void} 
   */
  function initKeggPathwayList(): void 
  {
    $.get(root_path + 'api/v1/list/kegg_pathways')
      .done((keggStr) => {
        let keggObjs = JSON.parse(keggStr),
          bloodhound = new Bloodhound({
            datumTokenizer: (datum) => { return [datum.label]; },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: () => { return keggObjs; },
            identify: (obj) => { return obj['@id']; },
          });
        $('#searchBox')
          .typeahead('destroy')
          .typeahead({
            hint: true,
            highlight: true,
            minLength: 1
          }, {
              name: 'kegg-pathways-list',
              display: 'label',
              source: bloodhound
            })
          .attr('placeholder', 'Search for a Kegg Pathway')
          .off('typeahead:select')
          .on('typeahead:select', (ev, keggObj) => {
            drawCompleteGraph(keggObj, 'kegg_pathways');
          });
      })
      .fail((error) => {
        let e = new Error(error.statusText);
        e.name = error.status;
        errorHandler(e, 'critical', false); 
      });
  }

  /**
   * Draw a complete graph on the canvas
   * @param semnextObj {DiseaseObj | KeggPathwayObject | CustomObject} the 
   *  semnext object obtained from the API the contains the metadata about 
   *  the graph to draw
   * @param data_type {string} one of 'disease', 'kegg_pathways', or 'custom'
   * @param callback {() => any} optional. function to call on completion
   */
  export function drawCompleteGraph(semnextObj: 
    DiseaseObject|KeggPathwayObject|CustomObject, data_type: string, 
    callback?: () => any): void 
  {
    canvas.clear();
    $('.welcome-message').hide();
    $('.loading').show();
    $.post(root_path + 'api/v1/matrix/' + data_type, {
       id: semnextObj['@id']
    })
      .done((raw_data: string[][]) => {
        try {
          let data = Munge.munge(raw_data);
          if (data.labels.length < MIN_GRAPH_SIZE) {
            let error = new Error('Not enough data received to create CHeM.');
            error.name = 'CHeM Error';
            throw error;
          }
          data.title = semnextObj.label;
          $('.loading').hide();
          try {
            let g = new CHeM.Graph(data, canvas)
              .drawChords()
              .drawClusterBands()
              .drawTextLabels()
              .drawCircularHeatmap()
              .drawClusterLegend()
              .drawHeatmapLegend()
              .drawTitle();
            graph = g;
          }
          catch (e) {
            let error = new Error('Creation of CHeM reached an unknown error.');
            error.name = 'CHeM Error';
            throw error;
          }
          fade_opacity = graph.getFadeOpacity();
          runAnalytics();
          if (callback) callback();
        }
        catch (error) {
          errorHandler(error, 'critical', true);
        }
      })
      .fail((error) => {
        error = JSON.parse(error.responseText);
        errorHandler(error, 'critical', true); 
      });
  }
  
  /**
   * Run the analysis of semnext data for this input.
   * @returns {void}
   */
  function runAnalytics(): void 
  {
    let data = graph.getData(),
      genes = _.map(data.labels, (label, i) => {
        return {
          label: label,
          cluster: data.clusters[i]
        };
      });
    let lowest_pval = Infinity,
      lowest_cluster = -1;
    for (var i=1; i<=6; i++) {
      let [log_odds, pval] = Analysis.clusterEnrichment(genes, i);
      $($('.cluster-enrichment .log-odds td')[i]).text(log_odds.toPrecision(4));
      $($('.cluster-enrichment .p-value td')[i]).text(pval.toPrecision(4));
      if (pval < lowest_pval) {
        lowest_pval = pval;
        lowest_cluster = i;
      }
    }
    dom_cluster = lowest_cluster;
  }

  /**
   * Attach event listeners to all the buttons and inputs
   * @returns {void} 
   */
  function attachListener(): void 
  {
    $('body').off('click').on('click', '.chart-btn', (e: Event) => {
      let $btn = $(e.target);
      while (!$btn.hasClass('chart-btn')) {
        $btn = $btn.parent();
      }
      let action = $btn.attr('data-action'),
        target = $btn.attr('data-target');
      switch (action) {
        // Primary options bar
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
          setHighlightOnClick(
            $('.highlight-btn[data-action="highlight-click"]')
          );
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
        // Options Bar
        case 'change-options-bar':
          updateOptionsBar(target);
          break;
        case 'download-svg':
          downloadSVG();
          break;
        case 'download-png':
          downloadPNG();
          break;
        case 'download-raw-heatmap':
          downloadRawHeatMap();
          break;
        case 'download-raw-connections':
          downloadRawConnections();
          break;
        case 'show-legends':
          showLegends($(e.target));
          break;
        case 'hide-legends':
          hideLegends($(e.target));
          break;
        case 'custom-data':
          openCustomCHeMMenu();
          break;
        case 'set-D310-colors':
          graph.recolor(CHeM.Graph.d3Cat10Colors);
          graph.recolorHeatMap(CHeM.Graph.defaultHeatMapColors);
          graph.chordBackground('none');          
          break;
        case 'set-matlab-colors':
          graph.recolor(CHeM.Graph.matlabColors);
          graph.recolorHeatMap(CHeM.Graph.defaultHeatMapColors);
          graph.chordBackground('none');          
          break;
        case 'set-colorblind-colors':
          graph.recolor(CHeM.Graph.colorblindSafeColors);
          graph.recolorHeatMap(CHeM.Graph.colorblindSafeHeatMapColors);
          graph.chordBackground('#000');
          break;
        case 'set-light-theme':
          toggleTheme( $(e.target), '#FFF', '#000' );
          break;
        case 'set-dark-theme':
          toggleTheme( $(e.target), '#000', '#FFF' );
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
        // Error messages
        case 'close-error':
          $btn.remove();
          break;
      }
    });
    $('.custom-dataset-menu input[name="gene-file"]').off()
        .on('change', (e: Event) => 
      {
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

  /**
   * Clear the current highlighting for the active graph
   * @returns {void}
   */
  function clearHighlighting(): void 
  {
    $('.highlight-btn').removeClass('active');
    canvas.getSVG().selectAll('g.group, .heatmap-arc, .cluster-arc')
      .on('mouseover', _.noop)
      .on('mouseout', _.noop)
      .on('click', _.noop);
  }

  /**
   * Set the highlight for the graph to 'on hover'
   * @param btn {JQuery} the button that sets the highlight to 'on hover'
   * @returns {void}
   */
  function setHighlightOnHover(btn: JQuery): void 
  {
    clearHighlighting();
    btn.addClass('active');
    canvas.getSVG().selectAll('g.group, .heatmap-arc')
      .on('mouseover', CHeM.getFader(canvas.getHandle(), fade_opacity))
      .on('mouseout', CHeM.getFader(canvas.getHandle(), 1.00));
    canvas.getSVG().selectAll('cluster-arc')
      .on('mouseover', CHeM.getClusterFader(canvas.getHandle(), fade_opacity))
      .on('mouseout', CHeM.getClusterFader(canvas.getHandle(), fade_opacity));
  }

  /**
   * Set the highlight for the graph to 'on click'
   * @param btn {JQuery} the button that sets the highlight to 'on click'
   * @returns {void}
   */
  function setHighlightOnClick(btn: JQuery): void 
  {
    clearHighlighting();
    btn.addClass('active');
    canvas.getSVG().selectAll('g.group, .heatmap-arc')
      .on('click', CHeM.getToggleFader(canvas.getHandle(),
        fade_opacity));
    canvas.getSVG().selectAll('.cluster-arc')
      .on('click', CHeM.getToggleClusterFader(canvas.getHandle(),
        fade_opacity));
  }

  /**
   * Highlight the dominant cluster defined for the specific data set
   * @returns {void}
   */
  function highlightDominantCluster(): void 
  {
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

  /**
   * Display all the chords for the current graph
   * @returns {void}
   */
  function displayAll(): void 
  {
    canvas.getSVG().selectAll('path.chord, .chordMask')
      .transition()
      .style('opacity', 1.0)
      .attr('visible', true);
  }

  /**
   * Display none of the chords for the current graph
   * @returns {void}
   */
  function displayNone(): void 
  {
    canvas.getSVG().selectAll('path.chord, .chordMask')
      .transition()
      .style('opacity', fade_opacity)
      .attr('visible', false);
  }

  /**
   * Invert the highlighting of the chords for the current graph
   * @returns {void}
   */
  function invertDisplay(): void 
  {
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
  
  /**
   * Toggle the visibility of the expanded settings menu
   * @param btn {JQuery} handle to the button that toggles the menu 
   * @returns {void}
   */
  function toggleSettings(btn: JQuery): void 
  {
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
    btn.attr('expanded', (!toggle) + '');
  }
  
  /**
   * Change with submenu of the expanded settings menu is displayed
   * @param target {string} name of the submenu to changed to
   * @returns {void}
   */
  function updateOptionsBar(target: string): void 
  {
    $('.expanded-settings-bar .options-list .selected')
      .removeClass('selected');
    $('.expanded-settings-bar .options-list li[data-target="' + target + '"]')
      .addClass('selected');
    $('.active-options-bar .active-option').hide();
    $('.active-options-bar .' + target)
      .show()
      .addClass('active-option');
  }
  
  /**
   * Get the source of the current graph as an SVG base64-encoded string
   * @returns {string}
   */
  function getSVGSource(): string 
  {
    return 'data:image/svg+xml;base64,' +
      btoa($('svg')
        .attr('version', 1.1)
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .parent().html());
  }

  /**
   * Trigger a download of the current graph as an SVG
   * @returns {void}
   */
  function downloadSVG(): void 
  {
    let a = document.createElement('a');
    a.download = graph.getData().title + '.svg';
    a.href = getSVGSource();
    a.click();
  }
  
  /**
   * Trigger a download of the current graph as a PNG
   * @returns {void}
   */
  function downloadPNG(): void 
  {
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
  
  /**
   * Hide the legends for the graph
   * @param btn {Jquery} optional. The button that triggered the event to hide 
   *  the legends
   * @returns {void}
   */
  function hideLegends(btn?: JQuery): void 
  {
    canvas.getSVG().select('.clusterLegend').remove();
    canvas.getSVG().select('.heatmapLegend').remove();
    if (btn) {
      btn.text('Show Legends')
        .attr('data-action', 'show-legends');
    }
  }

  /**
   * Redraw the legends for the graph
   * @param btn {Jquery} optional. The button that triggered the event to show 
   *  the legends
   * @returns {void}
   */
  function showLegends(btn?: JQuery): void 
  {
    graph.drawClusterLegend()
      .drawHeatmapLegend();
    if (btn) {
      btn.text('Hide Legends')
        .attr('data-action', 'hide-legends');
    }
  }

  /**
   * Display the menu to create a custom graph
   * @returns {void}
   */
  function openCustomCHeMMenu(): void 
  {
    $('.chart-status').hide();
    $('.welcome-message').hide();
    $('.custom-dataset-menu').toggle();
  }

  /**
   * Create a custom graph from the list of genes in the input box of the 
   *  custom CHeM menu
   * @returns {void}
   */
  function createCustomCHeM(): void 
  {
    let $geneBox = $('.custom-dataset-menu textarea'),
      title = $('.custom-dataset-menu input[name="custom-name"]').val(),
      raw_genes = $geneBox.val(),
      genes = parseGeneInput(raw_genes);
    let CustomObj: CustomObject = {
      '@id': genes.join(','),
      label: title
    }
    $('.custom-dataset-menu').hide();
    drawCompleteGraph(CustomObj, 'custom', () => {
      let missing_genes = _.difference(genes, graph.getData().labels);
      if (missing_genes.length > 0) {
        let error = new Error()
        error.name = "Missing Genes";
        error.message = missing_genes.join(',');
        errorHandler(error, 'warning', true);
      }
    });
  }

  /**
   * Helper function to parse an input list of genes
   * @param raw_genes {string} input string containing a comma-separated list 
   *  of genes
   * @returns {string[]} array of gene strings
   */
  function parseGeneInput(raw_genes: string): string[] 
  {
    let genes: string[] = [];
    genes = raw_genes.split(',');
    genes = _.flatten(_.map(genes, (gene) => {
      gene = gene.trim();
      return gene.split('\n');
    }));
    return genes;
  }

  /**
   * set the search box to search by disease
   * @returns {void}
   */
  function setDiseaseSearch(): void 
  {
    initDiseaseList();
  }

  /**
   * set the search box to search by KEGG pathway
   * @returns {void}
   */
  function setKeggPathwaySearch(): void 
  {
    initKeggPathwayList();
  }
  
  /**
   * Download the data used to create the heat map as a CSV file
   * @returns {void}
   */
  function downloadRawHeatMap(): void
  {
    const DAYS = 9;
    let data = graph.getData().heatmap,
        filestream = '',
        gene_data = Array( graph.getData().labels.length );
    for (var i=0; i<data.length; i++) {
      if (gene_data[ Math.floor(i / DAYS) ] === undefined) {
        gene_data[ Math.floor(i / DAYS) ] = {
          symbol: data[i].label,
          values: [ data[i].value ]
        };
      } else {
        gene_data[ Math.floor(i / DAYS) ].values.push( data[i].value );
      }
    }
    for (let i in gene_data) {
      filestream += i + ',' + gene_data[i].symbol;
      for (let d in gene_data[i].values) {
        filestream += ',' + gene_data[i].values[d];
      }
      filestream += '\n';
    }
    let filename = graph.getData().title + '_heat_map_data.csv';
    downloadTextFile(filestream, filename);
  }
  
  /**
   * Download the gene connection data used to create the chords. The genes are
   *  numbered clockwise around the diagram.
   * @returns {void}
   */
  function downloadRawConnections(): void
  {
    let data = graph.getData().chord_matrix,
        filestream = '';
    for (var i=0; i<data.length; i++) {
      for (var k=i; k<data[i].length; k++) {
        if (data[i][k] > 0) {
          filestream += i + ',' + k + '\n';
        }
      }
    }
    let filename = graph.getData().title + '_connection_data.csv';
    downloadTextFile(filestream, filename);
  }
  
  /**
   * Trigger a dowload of a text file
   * @param text {string} content of the file to download
   * @param filename {string} name of the file to save the download as
   * @returns {void}
   */
  function downloadTextFile(text: string, filename: string): void {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' 
      + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
  
  /**
   * 
   */
  function toggleTheme($btn: JQuery, bgColor: string, fgColor: string): void {
    $('theme-btn').removeClass('active');
    $btn.addClass('active');
    $('body').css({ 'background-color': bgColor });
    canvas.getHandle().style({ 'background-color': bgColor });
    canvas.getSVG().selectAll('text').style({ 'fill': fgColor });
  }
  
} /* END UI NAMESPACE */

export = UI;
