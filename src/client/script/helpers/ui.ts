/// <reference path="../../../../definitions/index.d.ts" />

/**
 * ui.ts
 * 
 * Adds the interactivity to the user interface (i.e. buttons, input, etc.)
 */
import Munge = require('./../../../helpers/munge');
import Analysis = require('./../../../helpers/analysis');
import CHeM = require('./graph');

import * as $ from 'jquery';
import * as _ from 'underscore';

import * as Awesomplete from 'awesomplete';
import {Mustache} from 'mustache';

window.jQuery = $;
import 'bootstrap';


/**
 * The namespace that contains all functions related to the user interface.
 */
namespace UI {

  let graph: CHeM.Graph,
      canvas: CHeM.Canvas,
      root_path: string,
      fade_opacity: number,
      dom_cluster: number;
  let search_box = new Awesomplete(document.getElementById('search-box'), {
    list: [],
    minChars: 1,
    maxItems: 5,
    autoFirst: true,
    replace: function(text) { this.input.value = text.label; }
  });
  let search_box_cb = (label: string, value: string) => {};
  document.getElementById('search-box').addEventListener('awesomplete-selectcomplete', 
    (e) => {
      search_box_cb(e['text'].label, e['text'].value);
  });

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
    attachListener();
    setDiseaseSearch();
    var ua = window.navigator.userAgent,
        IE = ua.indexOf('MSIE') > 0 || !! ua.match(/Trident.*rv\:11\./),
        Edge = ua.indexOf('Edge') > 0;
    /* Disable features that don't yet work in IE or Edge */
    if ( IE || Edge ) {
      var broken = [
        '.chart-btn[data-action="download-png"]',
        '.chart-btn[data-action="path-color-gradient"]'
      ];
      for (var i=0; i<broken.length; i++) {
        $(broken[i])
          .removeClass('chart-btn')
          .addClass('disabled')
          .attr('title', 'Feature not available in IE or Edge.');
      }
    }
    // get the current version number
    $.get(root_path + 'version')
      .done((version: string) => {
        $('#version').text(version);
      });
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
        class: 'error-bar menu-btn',
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
   * @param $input {JQuery} input field to initialize typeahead
   * @param onSelect {(event, obj) => any} function to call when a typeahead
   *  selection is made
   * @param cd {(diseaseObjs) => any} callback function
   * @returns {void}
   */
  function initDiseaseList($input: JQuery, onSelect: (label: string, value: string) => any,
    cb: (disease_objs) => any): void 
  {
    $.get(root_path + 'api/v1/list/disease')
      .done((disease_objs) => {
        disease_objs = _.map(disease_objs, (obj: DiseaseObject) => { 
          return {label: obj.label, value: obj['@id']};
        });
        search_box.list = disease_objs;
        search_box_cb = onSelect;
        cb(disease_objs);
      })
      .fail((error) => {
        let e = new Error(error.statusText);
        e.name = error.status;
        errorHandler(e, 'critical', false);
      });
  }
  
  /** 
   * Initialize the list of KEGG Pathways using Typeahead for autocomplete.
   * @param $input {JQuery} input field to initialize typeahead
   * @param onSelect {(event, obj) => any} function to call when a typeahead
   *  selection is made
   * @param cd {(diseaseObjs) => any} callback function
   * @returns {void} 
   */
  function initKeggPathwayList($input: JQuery, onSelect: (label: string, value: string) => any,
    cb: (kegg_objs) => any): void 
  {
    $.get(root_path + 'api/v1/list/kegg_pathways')
      .done((kegg_objs) => {
        kegg_objs = _.map(kegg_objs, (obj: DiseaseObject) => { 
          return {label: obj.label, value: obj['@id']};
        });
        search_box.list = kegg_objs;
        search_box_cb = onSelect;
        cb(kegg_objs);
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
  export function drawCompleteGraph(semnextObj: DiseaseObject|KeggPathwayObject|CustomObject, 
    data_type: string, callback?: () => any): void 
  {
    canvas.clear();
    $('.content .messages').empty();
    $('.error-bar-bin').empty();
    $('.chart').hide();
    $.get(root_path + 'templates/loading.mst', function(template) {
      $('.content .messages').html( template );
    });
    $('#intersection-active').text('');

    fetchGraphData(semnextObj, data_type, (data: Munge.chem_data, error: any) => {
      if (error) {
        error = JSON.parse(error.responseText);
        errorHandler(error, 'critical', true); 
      } else {
        newGraph(data, semnextObj.label);
        $('#intersection-base').text(graph.getData().title);
      }
    });

  }

  /**
   * Draw a complete graph on the canvas
   * @param semnextObj the semnext object obtained from the API the contains the metadata about the
   * graph to draw
   * @param data_type one of 'disease', 'kegg_pathways', or 'custom'
   * @param callback optional. function to call on completion
   */
  function fetchGraphData(semnextObj: DiseaseObject|KeggPathwayObject|CustomObject,
    data_type: string, callback: (data: Munge.chem_data, error: any) => any): void
  {
    $.post(root_path + 'api/v1/matrix/' + data_type, {
       id: semnextObj['@id']
    }).done((raw_data: string[][]) => {
      let data = Munge.munge(raw_data);      
      callback(data, null);
    }).fail((error) => {
      callback(null, error);
    });
  }

  /**
   * Create a new graph given munged data and a title
   * @param data the munged data set with which to create the graph
   * @param title the title to be placed about the graph
   */
  export function newGraph(data: Munge.chem_data, title: string): void 
  {
    try {
      if (data.labels.length < MIN_GRAPH_SIZE) {
        let view = {
          data: [],
          total: 0,
          minimum: MIN_GRAPH_SIZE
        };
        for (var i in data.labels) {
          view.data.push({
            symbol: data.labels[i],
            cluster: data.clusters[i]
          });
        }
        view.total = view.data.length;
        $.get(root_path + 'templates/data_table.mst', function(template) {
          let rendered = Mustache.render(template, view);
          $('.content .messages')
            .empty()
            .html( rendered );
        });
        let error = new Error('Not enough data received to create SWOT Clock.');
        error.name = 'SWOT Clock Error';
        throw error;
      }
      data.title = title;
      $('.content .messages').empty();
      $('.chart').show();
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
        let error = new Error('Creation of SWOT Clock reached an unknown error.');
        error.name = 'SWOT Clock Error';
        throw error;
      }
      fade_opacity = graph.getFadeOpacity();
      updateHighlighting();
      updateColorScheme();
      updateTheme();
      runEnrichment($('.menu-btn[data-action="enrichment"].dropdown-active').attr('data-target'));
    }
    catch (error) {
      errorHandler(error, 'critical', true);
    }
  }
  
  /**
   * Run the analysis of semnext data for this input. Calculates the dominant
   * cluster.
   * @param {string} method the enrichment method to run, either 'fishers-exact' or 'z-test'
   * @returns {void}
   */
  function runEnrichment(method: string): void 
  {
    if (!graph) {
      return;
    }
    let data = graph.getData();
    let genes = _.map(data.labels, (label, i) => {
          return {
            label: label,
            cluster: data.clusters[i]
          };
        });
    let lowest_pval = Infinity;
    let lowest_cluster = -1;
    let all_log_odds = [];
    let p_value_promises = [];
    for (var i=1; i<=6; i++) {
      let [n11, n12, n21, n22] = Analysis.contingencyTable(genes, i);
      let log_odds = Analysis.logOdds(n11, n12, n21, n22);
      all_log_odds.push(log_odds.toPrecision(4));
      let prom = new Promise((resolve, reject) => {
        if (method == 'fishers-exact') {
          // closure!
          ((i) => {
            $.post(root_path + 'api/v1/analysis/fisher_exact',
              { n11: n11, n12: n12, n21: n21, n22: n22 },
              (p_value) => {
                p_value = parseFloat(parseFloat(p_value).toPrecision(4));
                resolve(p_value);
              });
          })(i);
        } else {
          let p_value = Analysis.zTest(n11, n12, n21, n22);
          p_value = parseFloat(p_value.toPrecision(4));
          resolve(p_value);
        }
      });
      p_value_promises.push(prom);
    }
    Promise.all(p_value_promises).then((all_p_values) => {
      for (let i=0; i<6; i++) {
        // dominant cluster is the cluster with a positive log odds ratio and the lowest p-value        
        if (all_log_odds[i] > 0 && all_p_values[i] < lowest_pval) {
          lowest_pval = all_p_values[i];
          lowest_cluster = i;
        }
      }
      dom_cluster = lowest_cluster + 1;
      graph.drawEnrichmentTable(all_log_odds, all_p_values);
    });
  }

  /**
   * Attach event listeners to all the buttons and inputs
   * @returns {void} 
   */
  function attachListener(): void 
  {
    $('body').off('click').on('click', '.menu-btn', (e: Event) => {
      let $btn = $(e.target);
      while (!$btn.hasClass('menu-btn')) {
        $btn = $btn.parent();
      }
      let action = $btn.attr('data-action'),
          target = $btn.attr('data-target');
      switch (action) {
        case 'dropdown':
          $('.dropdown-content').hide();
          $('#' + target).toggle();
          break;
        case 'dropside':
          $('.dropside-content').removeClass('display-inline-block');          
          $('#' + target).toggleClass('display-inline-block');
          break;
        case 'highlight':
          selectMenuOption(action, target);
          if (target === 'hover') {
            updateHighlighting(() => { setHighlightOnHover($(e.target)); });            
          } else if (target === 'click') {
            updateHighlighting(() => { setHighlightOnClick($(e.target)); });            
          } else if (target === 'none') {
            updateHighlighting(() => { clearHighlighting(); });
          }
          break;
        case 'highlight-dom':
          highlightDominantCluster();
          setHighlightOnClick($('.highlight-btn[data-action="highlight-click"]'));
          selectMenuOption('highlight', 'click');
          break;
        case 'display':
          if (target === 'all') {
            displayAll();
          } else if (target === 'none') {
            displayNone();
          } else if (target === 'invert') {
            invertDisplay();
          }
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
        case 'toggle-legends':
          toggleLegends();
          break;
        case 'toggle-enrichment':
          toggleEnrichmentTable();
          break;
        case 'custom-data':
          openCustomCHeMMenu();
          break;
        case 'colors':
          selectMenuOption(action, target);
          if (target === 'd310') {
            updateColorScheme('D310');            
          } else if (target === 'matlab') {
            updateColorScheme('matlab');
          } else if (target === 'colorblind') {
            updateColorScheme('colorblind-safe');            
          }
          break;
        case 'theme':
          selectMenuOption(action, target);
          if (target === 'light') {
            updateTheme( $(e.target), '#FFF', '#000' );
          } else if (target === 'dark') {
            updateTheme( $(e.target), '#000', '#FFF' );
          }
          break;
        case 'chord-gradient':
          graph.drawGradientPaths();
          break;
        case 'set-search':
          selectMenuOption(action, target);
          if (target === 'disease') {
            setDiseaseSearch();
          } else if (target === 'kegg') {
            setKeggPathwaySearch();
          }
          break;
        case 'create-custom':
          createCustomCHeM();
          break;
        case 'clear-custom-genes':
          $('.custom-dataset-menu textarea').val('');
          break;
        case 'enrichment':
          selectMenuOption(action, target);
          runEnrichment(target);
          break;
        case 'search-modifier':
          selectMenuOption(action, target);
          if (target === 'intersection') {
            toggleIntersection();
          }
          break;
        case 'open-about':
          openAboutPage();
          break;
        // Error messages
        case 'close-error':
          $btn.remove();
          break;
      }
    });
    $('.custom-dataset-menu input[name="gene-file"]').off().on('change', (e: Event) => 
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
    $('body').on('click', (e: Event) => {
      let $btn = $(e.target);
      if (!$btn.hasClass('drop-btn') && !$btn.hasClass('dropdown-submenu')) {
        $('.dropdown-content').hide();
        $('.dropside-content').removeClass('display-inline-block');
      }
      if ($btn.hasClass('drop-btn')) {
        $('.dropside-content').removeClass('display-inline-block');        
      }
    });
  }
  
  /**
   * Update the highlight setting. If no highlight function is given, then the
   *  previous input is used.
   * @param highlightFunc {() => void} Default = current. Function to update
   *  the highlighting setting
   * @returns {void}
   */
  var updateHighlighting = (() => {
    let current = _.noop;
    return function(highlightFunc = current)
    {
      highlightFunc();
      current = highlightFunc;
    }
  })();

  function selectMenuOption(action: string, target: string): void
  {
    let check = '<i class="fa fa-check"></i> ';
    let $btns = $('.menu-btn[data-action="' + action + '"]');
    for (let i=0; i<$btns.length; i++) {
      let $btn = $($btns[i]);
      let t = $btn.html();
      t = t.replace(check, '');
      $btn.html(t);
      $btn.removeClass('dropdown-active');
    }
    let $btn = $('.menu-btn[data-action="' + action + '"][data-target="' + target + '"]');
    let t = $btn.html();
    $btn.html(check + t);
    $btn.addClass('dropdown-active');
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
    canvas.getSVG().selectAll('.cluster-arc')
      .on('mouseover', CHeM.getClusterFader(canvas.getHandle(), fade_opacity))
      .on('mouseout', CHeM.getClusterFader(canvas.getHandle(), 1.00));
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
   * Generate a blob url for the current clock
   * @param contentType {string} content-type for the blob data
   * @returns {string}
   */
  function getBlobClock(contentType): Blob
  {
    var byteCharacters = $('svg')
            .attr('version', 1.1)
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .parent().html(),
        byteNumbers = new Array(byteCharacters.length);
    for (var i=0; i<byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    var byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], {type: contentType});
  }

  /**
   * Trigger a download of the current graph as an SVG
   * @returns {void}
   */
  function downloadSVG(): void 
  {
    var blob = getBlobClock('image/svg+xml');    
    var ua = window.navigator.userAgent;
    if ( ua.indexOf('MSIE') > 0 || !! ua.match(/Trident.*rv\:11\./) ) {
      window.navigator.msSaveBlob(blob, graph.getData().title + '.svg');
    } else {
      let a = document.createElement('a');
      a.download = graph.getData().title + '.svg';
      a.href = URL.createObjectURL(blob);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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
    var blob = getBlobClock('image/svg+xml');
    image.src = URL.createObjectURL(blob);
    image.onload = () => {
      context.drawImage(image, 0, 0);
      var dataurl = canvasElem.toDataURL('image/png');
      var ua = window.navigator.userAgent;
      if ( ua.indexOf('MSIE') > 0 || !! ua.match(/Trident.*rv\:11\./) ||
           ua.indexOf('Edge') > 0 ) {
        return;
      } else {
        let a = document.createElement('a');
        a.download = graph.getData().title + '.png';
        a.href = dataurl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  }

  /**
   * Toggle the enrichment table in the graph
   */
  let toggleEnrichmentTable = (function() {
    let visible = true;
    return () => {
      if (visible) {
        canvas.getSVG().select('.enrichmentTable').remove();
      } else {
        runEnrichment($('.menu-btn[data-action="enrichment"].dropdown-active').attr('data-target'));
      }
      updateTheme();
      visible = !visible;
    }
  })();


  /**
   * Toggle the legends in the graph
   */
  let toggleLegends = (function() {
    let visible = true;
    return () => {
      if (visible) {
        canvas.getSVG().select('.clusterLegend').remove();
        canvas.getSVG().select('.heatmapLegend').remove();
      } else {
        graph.drawClusterLegend()
            .drawHeatmapLegend();
      }
      updateTheme();
      visible = !visible;
    }
  })();

  /**
   * Toggle intersection mode so that search completion triggers an intersected graph instead of a
   * completely new graph
   */
  let toggleIntersection = (function() {
    let active = false;
    return () => {
      let target = $('.menu-btn.dropdown-active[data-action="set-search"]').attr('data-target');
      if (active) {
        if (target === 'disease') {
          search_box_cb = (label: string, value: string) => {
            drawCompleteGraph({ label: label, '@id': value, '@context': ''}, 'disease'); };
        } else {
          search_box_cb = (label: string, value: string) => {
            drawCompleteGraph({ label: label, '@id': value, '@context': ''}, 'kegg_pathways'); };
        }
        $('#search-mode').text('').hide();
        selectMenuOption('search-modifier', '');
      } else {
        if (!graph) {
          let error = new Error();
          error.name = 'User Error';
          error.message = 'You must first create a base clock';
          errorHandler(error, 'info', true);
          selectMenuOption('search-modifier', '');
          return;
        }
        if (target === 'disease') {
          search_box_cb = (label: string, value: string) => {
            computeIntersection({ label: label, '@id': value, '@context': ''}, 'disease'); };
        } else {
          search_box_cb = (label: string, value: string) => {
            computeIntersection({ label: label, '@id': value, '@context': ''}, 'kegg_pathways'); };
        }
        $('#search-mode').text('Intersection').show();
      }
      active = !active;
    }
  })();

  /**
   * Display the menu to create a custom graph
   * @returns {void}
   */
  function openCustomCHeMMenu(): void 
  {
    $('.content .messages').empty();
    $('.chart').hide();
    $.get(root_path + 'templates/custom_menu.mst', function(template) {
      $('.content .messages').html( template );
    });
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
   * Displays the about page
   */
  function openAboutPage(): void
  {
    $('.content .messages').empty();
    $('.chart').hide();
    $.get(root_path + 'templates/about.mst', function(template) {
      $('.content .messages').html( template );
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
    let on_select = $('#search-mode').text() === 'Intersection' ?
      (label: string, value: string) => {
        computeIntersection({ label: label, '@id': value, '@context': ''}, 'disease'); } :
      (label: string, value: string) => {
        drawCompleteGraph({ label: label, '@id': value, '@context': ''}, 'disease'); };
    initDiseaseList($('#searchBox'), on_select, (disease_objs) => {
      $('.totalDiseases').text(disease_objs.length);
      $('#search-box').focus().attr('placeholder', 'Search for a disease');
    });
  }

  /**
   * set the search box to search by KEGG pathway
   * @returns {void}
   */
  function setKeggPathwaySearch(): void 
  {
    let on_select = $('#search-mode').text() === 'Intersection' ?
      (label: string, value: string) => {
        computeIntersection({ label: label, '@id': value, '@context': ''}, 'kegg_pathways'); } :
      (label: string, value: string) => {
        drawCompleteGraph({ label: label, '@id': value, '@context': ''}, 'kegg_pathways'); };
    initKeggPathwayList($('#searchBox'), on_select, (kegg_obj) => {
      $('#search-box').focus().attr('placeholder', 'Search for a Kegg Pathway');
    });
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
          cluster: data[i].cluster,
          values: [ data[i].value ]
        };
      } else {
        gene_data[ Math.floor(i / DAYS) ].values.push( data[i].value );
      }
    }
    filestream += 'index,symbol,cluster';
    for (let i in CHeM.Graph.heatMapDayNumbers) {
      filestream += ',d' + CHeM.Graph.heatMapDayNumbers[i];
    }
    filestream += '\n';
    for (let i in gene_data) {
      filestream += i + ',' + gene_data[i].symbol + ',' + gene_data[i].cluster
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
  function downloadTextFile(text: string, filename: string): void 
  {
    var byteNumbers = new Array(text.length);
    for (var i=0; i<text.length; i++) {
      byteNumbers[i] = text.charCodeAt(i);
    }
    var byteArray = new Uint8Array(byteNumbers),
        blob = new Blob([byteArray], {type: 'text/plain'}),
        dataurl = URL.createObjectURL(blob);
    var ua = window.navigator.userAgent;
    if ( ua.indexOf('MSIE') > 0 || !! ua.match(/Trident.*rv\:11\./) ) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      let element = document.createElement('a');
      element.setAttribute('href', dataurl);
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  }
  
  /**
   * Update the theme for the UI. Arguments default to the colors that were last
   *  used.
   * @param $btn {jQuery} Default = undefined. The button that triggered the
   *  update
   * @param bgColor {string} Default = currentBgColor. Valid CSS color string
   *  for the UI background
   * @param fgColor {string} Default = currentFgColor. Valid CSS color string
   *  for the UI foreground
   * @returns {void}
   */
  var updateTheme = (() => {
    let currentBgColor: string = undefined,
        currentFgColor: string = undefined;
    return function($btn = undefined, bgColor = currentBgColor, fgColor = 
      currentFgColor): void
    {
      if ($btn) {
        $('theme-btn').removeClass('active');
        $btn.addClass('active');
      }
      $('body').css({ 'background-color': bgColor });
      canvas.getHandle().style({ 'background-color': bgColor });
      canvas.getSVG().selectAll('text').style({ 'fill': fgColor });
      currentBgColor = bgColor;
      currentFgColor = fgColor;
    }
  })();
  
  /**
   * Update the color scheme for the active graph. If no color scheme is given,
   *  then the previous color scheme is used
   * @param scheme {string} Default = current. Can be one of 'D310', 'matlab',
   *  or 'colorblind-safe'
   * @returns {void}
   */
  var updateColorScheme = (() => {
    let current: string = 'colorblind-safe';
    return function(scheme = current): void 
    {
      switch (scheme) {
        case 'D310':
          graph.recolor(CHeM.Graph.d3Cat10Colors);
          graph.recolorHeatMap(CHeM.Graph.defaultHeatMapColors);
          graph.chordBackground('none');          
          break;
        case 'matlab':
          graph.recolor(CHeM.Graph.matlabColors);
          graph.recolorHeatMap(CHeM.Graph.defaultHeatMapColors);
          graph.chordBackground('none');          
          break;
        case 'colorblind-safe':
          graph.recolor(CHeM.Graph.colorblindSafeColors);
          graph.recolorHeatMap(CHeM.Graph.colorblindSafeHeatMapColors);
          graph.chordBackground('#000');
          break;
        default: return;
      }
      current = scheme;
    }
  })();

  /**
   * Compute and graph the intersection of the genes in the existing graph and the new semnext
   * object.
   * @param {DiseaseObject|KeggPathwayObject} semnextObj the new semnext object to intersect with
   * the current graph
   * @param {string} data_type the type of the new semnext object, either 'disease' or
   * 'kegg_pathways'
   * @return {void}
   */
  function computeIntersection(semnextObj: DiseaseObject|KeggPathwayObject, data_type: string): void
  {
    canvas.clear();
    $('.content .messages').empty();
    $('.error-bar-bin').empty();
    $('.chart').hide();
    $.get(root_path + 'templates/loading.mst', function(template) {
      $('.content .messages').html( template );
    });

    let old_data = graph.getData();
    fetchGraphData(semnextObj, data_type, (new_data, error) => {
      if (error) {
        errorHandler(error, 'critical', false);
        return;
      }
      let inter_labels = _.intersection(old_data.labels, new_data.labels);
      // go through the old data labels and look for ones that are not in the intersected labels
      let i = 0;
      while (i<old_data.labels.length) {
        if (!_.find(inter_labels, (datum) => { return datum === old_data.labels[i]; })) {
          // proceed to remove this datum from the data set
          old_data.labels.splice(i, 1);
          old_data.clusters.splice(i, 1);
          old_data.heatmap.splice(i * 9, 9);
          old_data.chord_matrix.splice(i, 1);
          for (let k=0; k<old_data.chord_matrix.length; k++) {
            old_data.chord_matrix[k].splice(i, 1);
          }
        } else {
          i++;
        }
      }
      for (let i=0; i<old_data.heatmap.length; i++) {
        old_data.heatmap[i].index = Math.floor(i / 9);
      }
      old_data.domc = undefined;
      let new_title;
      if (_.find(old_data.title.split(' '), (word) => { return word === 'Intersection'; })) {
        new_title = old_data.title + ', and ' + semnextObj.label;
        new_title = new_title.replace(/ and/, ',');
      } else {
        new_title = 'Intersection of ' + old_data.title + ' and ' + semnextObj.label;
      }
      newGraph(old_data, new_title);
    });
  }
  
} /* END UI NAMESPACE */

export = UI;
