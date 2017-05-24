/**
 * graph.ts
 * 
 * Contains the Graph and Canvas classes used to create the CHeM diagrams
 */
import Munge = require('./../../../helpers/munge');

import * as $ from 'jquery';
import * as _ from 'underscore';
import * as d3 from 'd3';

/**
 * Module that contains the Graph and Canvas classes along with their helper 
 *  functions
 */
module CHeM {

  interface margin 
  {
    top: number;
    bottom: number;
    right: number;
    left: number;
  }

  interface cluster_band 
  {
    genes: string[];
    endAngle: number;
    startAngle: number;
    cluster: number;
  }

  interface point 
  {
    x: number;
    y: number;
  }
  
  interface GraphOptions 
  {
    onMouseOver?: (d: any, i: number) => any;
    onMouseOut?: (d: any, i: number) => any;
    chord_padding?: number;
    heatmap_height?: number;
    fade_opacity?: number;
    cluster_band_width?: number;
    color_gradient_precision?: number;
    chord_fill?: (i) => string;
  }
  
  /**
   * The Canvas class is a wrapper around the SVG element upon which the Graph 
   *  should be drawn
   */
  export class Canvas {
    private $handle: d3.Selection<any>;
    private svg: any;
    private margins: margin;
    private width: number;
    private adj_width: number;
    private height: number;
    private adj_height: number;

    /**
     * Constructor for the Convas Class
     * @param $handle {d3.Selection<any>} handle to the JQuery object attached 
     *  to the SVG element
     * @param margins {margin} margins to use when creating the graph
     * @param width {number} width of the canvas
     * @param height {number} height of the canvas
     * @param center {boolean} center the contents of the canvas
     * @returns {void}
     */
    constructor($handle: d3.Selection<any>, margins: margin, width: number,
      height: number, center = true)
    {
      this.$handle = $handle;
      this.margins = margins;
      this.width = width;
      this.height = height;
      this.adj_width = width - this.margins.right - this.margins.left;
      this.adj_height = height - this.margins.top - this.margins.bottom;

      this.svg = this.$handle
        .append('svg')
          .attr('height', height)
          .attr('width', width)
          .style('font-size', '10px')
          .style('font-family', 'Arial, Helvetica, sans-serif')
        .append('g')
          .attr('transform', center ? 'translate(' +
            (this.adj_width / 2 + this.margins.left) + ',' +
            (this.adj_height / 2 + this.margins.top) + ')': '');
    }
    
    /**
     * ACCESSORS
     */
    getSVG(): any { return this.svg; }
    getWidth(): number { return this.width; }
    getAdjWidth(): number { return this.adj_width; }
    getHeight(): number { return this.height; }
    getAdjHeight(): number { return this.adj_height; }
    getMargins(): margin { return this.margins; }
    getHandle(): d3.Selection<any> { return this.$handle; }
    
    /**
     * Remove all child elements on the canvas
     * @returns {void}
     */
    clear(): void 
    {
      this.$handle.selectAll('svg g *').remove();
    }

  }

  /**
   * This is the main class used to create CHeM diagrams
   */
  export class Graph {
    private data: Munge.chem_data;
    private canvas: Canvas;
    private svg: any; // d3.svg
    private chord: any; // d3.layout.chord

    private innerRadius: number;
    private outerRadius: number;
    private chord_padding: number;
    private heatmap_height: number;
    private fade_opacity: number;
    private cluster_band_width: number;
    private color_gradient_precision: number;
    private group_widths: number[];
    
    private onMouseOver: (d: any, i: number) => any;
    private onMouseOut: (d: any, i: number) => any;
    
    private chord_fill: (i) => string;
    private heatmapColorScale: any; // d3.scale.linear
    private heatmapLegendScale: any; // d3.scale.linear
    private heatmapYScale: any; // d3.scale.ordinal

    private arc: d3.svg.Arc<d3.svg.arc.Arc>;

    static matlabColors = function(i): string {
      return (['#F00', '#FF0', '#0F0', '#0FF', '#00F', '#F0F'])[(i-1)%6];
    }
    static d3Cat10Colors = function(i): string {
      return (['#D62728', '#FF7F0E', '#2CA02C', '#1F77B4', '#9467BD',
        '#8C564B'])[(i-1)%6];
    }    
    static colorblindSafeColors = function(i): string {
      return (['#d73027', '#fc8d59', '#fee090', '#e0f3f8', '#91bfdb',
        '#4575b4'])[(i-1)%6];
    }
    
    static defaultHeatMapColors = ['green', '#232323', 'red'];
    static colorblindSafeHeatMapColors = ['blue', '#232323', 'yellow'];

    static clusterToStage = ['Pluripotency', 'Neuroectoderm',
      'Neural Differentiation', 'Cortical Specification', 'Deep Layers',
      'Upper Layers'];
    
    static heatMapDayNumbers = [0, 7, 12, 19, 26, 33, 49, 63, 77];
    
    /**
     * ACCESSORS
     */
    getCanvas(): Canvas { return this.canvas; }
    getData(): Munge.chem_data { return this.data; }
    getFadeOpacity(): number { return this.fade_opacity; }
    
    /**
     * Constructor for the Graph class
     * @param data {Munge.chem_data} data from which to create the graph
     * @param canvas {Canvas} parent Canvas object upon which to draw the graph
     * @param options {GraphOptions} optional. specify custom settings to use 
     *  when drawing the graph
     * @returns {void}
     */
    constructor(data: Munge.chem_data, canvas: Canvas, options?: GraphOptions) 
    {
      options = options || {};
      this.data = data;
      this.canvas = canvas;
      this.svg = this.canvas.getSVG();
      this.innerRadius = Math.min(this.canvas.getAdjWidth(),
        this.canvas.getAdjHeight()) *  0.41;
      this.outerRadius = this.innerRadius * 1.07;
      this.chord_padding = options.chord_padding || 0.02;
      this.heatmap_height = options.heatmap_height || 100;
      this.fade_opacity = options.fade_opacity || 0.02;
      this.cluster_band_width = options.cluster_band_width || 20;
      this.color_gradient_precision = options.color_gradient_precision || 20;
      this.onMouseOver = options.onMouseOver || _.noop;
      this.onMouseOut = options.onMouseOut || _.noop;
      this.chord_fill = options.chord_fill || Graph.d3Cat10Colors;
      this.group_widths = null;

      this.arc = d3.svg.arc()
        .innerRadius(this.innerRadius)
        .outerRadius(this.outerRadius);

      // initialize the chord structure
      this.chord = d3.layout.chord()
        .padding(this.chord_padding)
        .sortSubgroups(d3.descending)
        .matrix(this.data.chord_matrix);

      // make the heatmap colorScale to be mean +/- 2*sigma
      let mu = d3.mean(this.data.heatmap, (d) => { return d.value; }),
          sd = 0;
      this.data.heatmap.forEach((d) => { sd += Math.pow(d.value - mu, 2); });
      sd = Math.sqrt(sd / this.data.heatmap.length);
      this.heatmapColorScale = d3.scale.linear()
        .range(Graph.defaultHeatMapColors)
        .domain([mu - 3 * sd, mu, mu + 3 * sd]);

      // initialize more scales
      this.heatmapLegendScale = d3.scale.linear()
        .domain([0,3])
        .range(this.heatmapColorScale.domain());
      this.heatmapYScale = d3.scale.ordinal()
        .rangeRoundBands([0, this.heatmap_height])
        .domain(this.data.heatmap.map((d) => { return d.day; }));
    }
    
    /**
     * Get the widths (angles) for each group in the data 
     * @param force {boolean} default = false. overwrite the existing values and
     *  recalculate the angle measures
     * @returns {number[]}
     */
    getGroupWidths(force = false): number[] 
    {
      if (! this.group_widths || force) {
        this.group_widths = [];
        for (var i=0; i<this.chord.groups().length; i++) {
          let chord_obj = this.chord.groups()[i];
          this.group_widths.push(
            this.outerRadius * (chord_obj.endAngle - chord_obj.startAngle + 
              this.chord_padding)
          );
        }
      }
      return this.group_widths;
    }

    /**
     * Draw the chords of the graph
     * @returns {Graph} this
     */
    drawChords(): Graph 
    {
      // draw a background beneath the chords
      let bg = this.svg.append('circle')
            .attr('class', 'chord-bg')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r',  this.outerRadius)
            .attr('fill', 'none')
            .attr('stroke', 'none');
      // bind the chord groups data to the canvas
      let g = this.svg.selectAll('g.group')
          .data(this.chord.groups)
        .enter().append('svg:g')
          .attr('class', 'group')
          .each((d, i) => {
            d.angle = (d.startAngle + d.endAngle) / 2;
            d.cluster = this.data.clusters[i];
            d.gene = this.data.labels[i];
          })
          .attr('gene', (d) => { return d.gene })
          .on('mouseover', (d, i) => {
            getFader(this.canvas.getHandle(), this.fade_opacity)(d, i);
            this.onMouseOver(d, i);
          })
          .on('mouseout', (d, i) => {
            getFader(this.canvas.getHandle(), 1.00)(d, i);
            this.onMouseOut(d, i);
          });
      // draw the group arcs and colors them
      g.append('svg:path')
          .style('stroke', (d) => {
            return this.chord_fill(this.data.clusters[d.index]);
          })
          .style('fill', (d) => {
            return this.chord_fill(this.data.clusters[d.index]);
          })
          .attr('d', this.arc);

      // draw the chords
      this.svg.selectAll('path.chord')
          .data(this.chord.chords)
        .enter().append('svg:path')
          .attr('class', 'chord')
          .attr('visible', true)
          .attr('source', (d) => { return d.source.index; })
          .attr('target', (d) => { return d.target.index; })
          .each((d) => {
            d.source.name = this.data.labels[d.source.index];
            d.source.cluster = this.data.clusters[d.source.index];
            d.target.name = this.data.labels[d.target.index];
            d.target.cluster = this.data.clusters[d.target.index];
            d.pathString = d3.svg.chord().radius(this.innerRadius);
          })
          .style('stroke', (d) => {
            return d3.rgb(this.chord_fill(this.data.clusters[d.source.index]))
              .darker();
          })
          .style('fill', (d) => {
            return this.chord_fill(this.data.clusters[d.source.index]);
          })
          .attr('d', d3.svg.chord().radius(this.innerRadius));
        return this;
    }

    /**
     * draw the cluster bands for each group
     * @returns {Graph} this
     */
    drawClusterBands(): Graph 
    {
      // construct the cluster bands
      let cluster_bands: cluster_band[] = [],
          band_genes: string[] = [],
          band_startAngle: number,
          band_cluster: number;
      _.each(this.data.clusters, (d,i) => {
        if (i != 0 && d != this.data.clusters[i-1]) {
          cluster_bands.push({
            genes: band_genes,
            endAngle: (i === this.data.clusters.length - 1 ?
              this.chord.groups()[i].endAngle :
              this.chord.groups()[i-1].endAngle),
            startAngle: (band_startAngle ? band_startAngle : 0),
            cluster: (band_cluster ? band_cluster : this.data.clusters[i-1])
          });
          band_genes = [this.data.labels[i]];
          band_cluster = d;
          band_startAngle = this.chord.groups()[i].startAngle;
        }
        band_genes.push(this.data.labels[i]);
      });
      band_genes.push(this.data.labels[this.data.labels.length - 1]);
      cluster_bands.push({
        genes: band_genes,
        endAngle: this.chord.groups()[this.data.labels.length - 1].endAngle,
        startAngle: band_startAngle,
        cluster: band_cluster
      });

      // draw the cluster bands
      this.svg.selectAll('.cluster-arc')
          .data(cluster_bands)
        .enter().append('path')
          .attr('d', d3.svg.arc()
            .innerRadius(this.outerRadius)
            .outerRadius(this.outerRadius + this.cluster_band_width)
            .startAngle((d,i) => {
              return cluster_bands[i].startAngle - this.chord_padding / 2;
            })
            .endAngle((d,i) => {
              return cluster_bands[i].endAngle + this.chord_padding / 2;
            })
          )
          .attr('class', 'cluster-arc')
          .attr('fill', (d) => { return this.chord_fill(d.cluster); })
          .on('mouseover', (d, i) => {
            getClusterFader(this.canvas.getHandle(), this.fade_opacity)(d, i);
            this.onMouseOver(d, i);
          })
          .on('mouseout', (d, i) => {
            getClusterFader(this.canvas.getHandle(), 1.00)(d, i);
            this.onMouseOut(d, i);
          });
      return this;
    }

    /**
     * Draw the text label for each gene around the circle
     * @returns {Graph} this
     */
    drawTextLabels(): Graph 
    {
      this.svg.selectAll('g.group').append('svg:text')
          .attr('dy', '.35em')
          .attr('class', 'chord-label')
          .attr('text-anchor', (d) => {
            return d.angle > Math.PI ? 'end' : null;
          })
          .attr('transform', (d) => {
            return 'rotate(' + (d.angle * 180 / Math.PI - 90) + ')' +
              'translate(' + (this.outerRadius + 125) + ')' +
              (d.angle > Math.PI ? 'rotate(180)' : '');
          })
          .text((d) => { return this.data.labels[d.index]; });
      return this;
    }

    /**
     * Draw the circular heat map around the chord diagram
     * @returns {Graph} this
     */
    drawCircularHeatmap(): Graph 
    {
      this.svg.selectAll('.heatmap-arc')
          .data(this.data.heatmap)
        .enter().append('path')
          .attr('d', d3.svg.arc()
              .innerRadius((d, i) => {
                return this.outerRadius + this.cluster_band_width +
                  this.heatmapYScale(this.data.heatmap[i].day);
              })
              .outerRadius((d, i) => {
                return this.outerRadius + this.cluster_band_width +
                  this.heatmapYScale(this.data.heatmap[i].day) +
                  (this.heatmap_height / 9);
              })
              .startAngle((d, i) => {
                return this.chord.groups()[Math.floor(i / 9)].startAngle -
                  (this.chord_padding / 2);
              })
              .endAngle((d, i) => {
                return this.chord.groups()[Math.floor(i / 9)].endAngle +
                  (this.chord_padding / 2);
              })
          )
          .attr('class', 'heatmap-arc')
          .attr('fill', (d) => { return this.heatmapColorScale(d.value); })
          .on('mouseover', getFader(this.canvas.getHandle(),
            this.fade_opacity))
          .on('mouseout', getFader(this.canvas.getHandle(), 1.00));
      return this;
    }
    
    /**
     * Draw a rectangular heat map where the width of each group can be 
     *  specified.
     * @param group_widths {number[]} Default: this.getGroupWidths(). 
     *  Width of each chord group
     * @returns {Graph} this
     */
    drawRectangularHeatmap(group_widths = this.getGroupWidths()): Graph 
    {
      let sum = d3.sum(group_widths),
        scale_factor = this.canvas.getAdjWidth() / sum,
        run_sum = 0,
        box_height = this.canvas.getAdjHeight() / 9,
        x = group_widths.map((d) => {
          let width = d * scale_factor;
          run_sum += width;
          return {
            x: run_sum - width,
            w: width
          }
        }),
        y = d3.scale.ordinal()
          .rangeRoundBands([this.canvas.getAdjHeight(), 0])
          .domain(this.data.heatmap.map((d) => { return d.day; }));
      this.svg.selectAll('.tile')
          .data(this.data.heatmap)
        .enter().append('rect')
          .attr('class', 'tile')
          .attr('gene', (d) => { return d.label; })
          .attr('cluster', (d) => { return d.cluster; })
          .attr('x', (d,i) => { return x[i/9 >> 0].x })
          .attr('y', (d) => { return y(d.day); })
          .attr('width', (d,i) => { return x[i/9 >> 0].w })
          .attr('height', box_height)
          .style('fill', (d) => { return this.heatmapColorScale(d.value); })
          .on('mouseover', (d, i) => {
            getHeatMapFader(this.canvas.getHandle(), this.fade_opacity)(d, i);
            this.onMouseOver(d, i);
          })
          .on('mouseout', (d, i) => {
            getHeatMapFader(this.canvas.getHandle(), 1.00)(d, i);
            this.onMouseOut(d, i);
          });
      return this;
    }
    
    /**
     * Draw the legend for the clusters in the upper right corner
     * @returns {Graph} this
     */
    drawClusterLegend(): Graph 
    {
      let legend = this.svg.append("g")
            .attr("class", "clusterLegend")
            .attr("transform", "translate(" + (this.canvas.getAdjWidth() / 2 * 0.85) + "," +
              (- this.canvas.getAdjHeight() / 2 - this.canvas.getMargins().top * 0.75) + ")")
            .attr("height", 120)
            .attr("width", 300);
      let self = this;
      legend.selectAll("g")
          .data(d3.range(1, Graph.clusterToStage.length+1))
        .enter().append("g")
          .each(function(d, i) {
            let g = d3.select(this);
            g.append("rect")
              .attr("x", 50)
              .attr("y", i*20)
              .attr("width", 10)
              .attr("height", 10)
              .style("fill", self.chord_fill(d));
            g.append("text")
              .attr("x", 40)
              .attr("y", i*20 + 10)
              .attr("height", 30)
              .attr("width", 100)
              .attr("fill", '#000')
              .attr("text-anchor", "end")
              .style("font-size", "14px")
              .text(Graph.clusterToStage[i]);
          });
      return this;
    }

    /**
     * Draw the legend for the heat map in the upper left corner
     * @returns {Graph} this
     */
    drawHeatmapLegend(): Graph 
    {
      let self = this,
          legend = self.svg.append("g")
            .attr("class", "heatmapLegend")
            .attr("transform", "translate(" + (- self.canvas.getAdjWidth() / 2 * 0.85) + "," +
              (- self.canvas.getAdjHeight() / 2 - self.canvas.getMargins().top * 0.75) + ")")
            .attr("height", 100)
            .attr("width", 100)
      legend.selectAll("g")
          .data(d3.range(0,7))
        .enter().append("g")
          .each(function(d) {
            let g = d3.select(this);
            g.append("rect")
              .attr("x", -65)
              .attr("y", d*20)
              .attr("width", 20)
              .attr("height", 20)
              .style("fill",
                self.heatmapColorScale(self.heatmapLegendScale(d))
            );
            g.append("text")
              .attr("x", -40)
              .attr("y", d*20 + 15)
              .style('font-size', '12px')
              .text(Math.round(self.heatmapLegendScale(d) * 10000) / 10000 );
          });
      return self;
    }

    /**
     * Draws the enrichment table next to the cluster legend given the log odds and p-values
     * @param {any[]} log_odds an array of log odds values, one for each cluster
     * @param {any[]} p_values an array of p-values, on for each cluster
     * @returns {Graph} this
     */
    drawEnrichmentTable(log_odds: any[], p_values: any[]): Graph
    {
      log_odds = ['Log Odds'].concat(log_odds);
      p_values = ['p-value'].concat(p_values);
      let self = this;
      d3.select('.enrichmentTable').remove();
      let legend = self.svg.append("g")
            .attr("class", "enrichmentTable")
            .attr("transform", "translate(" + (self.canvas.getAdjWidth() / 2 * 0.85) + "," +
              (- self.canvas.getAdjHeight() / 2 - self.canvas.getMargins().top * 0.75) + ")")
            .attr("height", 120)
            .attr("width", 300);
      legend.selectAll('g.log-odds')
          .data(log_odds)
        .enter().append('g')
          .attr('class', 'log-odds')
          .each(function(d, i) {
            let g = d3.select(this);
            g.append('text')
              .attr('x', 75)
              .attr('y', i*20 - 10)
              .attr('text-anchor', 'start')
              .style('font-size', '14px')
              .text(d);
            if (i === 0) {
              g.style('font-weight', 'bold');
            } else {
              g.style('font-family', 'monospace');              
            }
          });
      legend.selectAll('g.p-value')
          .data(p_values)
        .enter().append('g')
          .attr('class', 'p-value')
          .each(function(d, i) {
            let g = d3.select(this);
            g.append('text')
              .attr('x', 155)
              .attr('y', i*20 - 10)
              .attr('text-anchor', 'start')
              .style('font-size', '14px')
              .text(d);
            if (i === 0) {
              g.style('font-weight', 'bold');
            } else {
              g.style('font-family', 'monospace');              
            }
          });
      return self;
    }
    
    /**
     * Draw the title of the data at the top center
     * @returns {Graph} this
     */
    drawTitle(): Graph 
    {
      this.svg.append("text")
          .attr("class", "title")
          .attr("transform", "translate(0," + (-this.canvas.getAdjHeight() / 2 -
             this.canvas.getMargins().top * 0.85) + ")")
          .attr("text-anchor", "middle")
          .style("font-size", "32px")
          .style("font-family", "Arial, Helvetica, sans-serif")
          .text(this.data.title);
      return this;
    }
    
    /**
     * Recolor the chords with a different color scheme
     * @param fill {(i) => string} function that takes an integer as an
     *  argument and returns the corresponding color as a hex string
     * @returns {Graph} this 
     */
    recolor(fill: (i) => string): Graph 
    {
      this.chord_fill = fill;
      d3.selectAll('path.chord')
        .style('fill', (d) => {
          return this.chord_fill(this.data.clusters[d.source.index]);
        })
        .style('stroke', (d) => {
          return this.chord_fill(this.data.clusters[d.source.index]);
        });
      _.each($('.chordMask'), (d) => {
        let gradient = d3.scale.linear()
          .range([this.chord_fill(this.data.clusters[$(d).attr('source')]),
                  this.chord_fill(this.data.clusters[$(d).attr('target')])])
          .domain([0, $(d).children().length]);
        _.each($(d).children(), (dd,i) => {
          d3.select(dd)
            .style('fill', gradient(i))
            .style('stroke', gradient(i));
        });
        return;
      });
      d3.selectAll('g.group path')
        .style('fill', (d) => { 
          return this.chord_fill(this.data.clusters[d.index]); })
        .style('stroke', (d) => { 
          return this.chord_fill(this.data.clusters[d.index]); })
      d3.selectAll('.cluster-arc')
        .style('fill', (d) => { return this.chord_fill(d.cluster); });
      d3.selectAll('.clusterLegend g rect')
        .style('fill', (d) => { return this.chord_fill(d); });
      return this;
    }
    
    /**
     * Recolor the heatmap with a different color scheme
     * @param fill {string[]} array of hex color strings
     * @returns {Graph} this
     */
    recolorHeatMap(fill: string[]): Graph
    {
      this.heatmapColorScale.range(fill);
      d3.selectAll('.heatmap-arc')
        .style('fill', (d) => { return this.heatmapColorScale(d.value); });
      d3.selectAll('.heatmapLegend g rect')
        .style('fill', (d) => { 
          return this.heatmapColorScale(this.heatmapLegendScale(d)); });
      return this;
    }
    
    /**
     * Change the color of the chord background
     * @param fill {string} valid color property value
     * @returns {Graph} this
     */
    chordBackground(fill: string): Graph
    {
      this.svg.select('circle.chord-bg')
        .attr('fill', fill);      
      return this;
    }

    /**
     * Redraw the chord paths with gradients (driver)
     * @returns {Graph} this
     */
    drawGradientPaths(): Graph 
    {
      this.svg.selectAll('path.chord')
        .each((d, i) => { this.drawGradientPath(d, i); })
        .remove();
      return this;
    }

    /**
     * Redraw the given path with a gradient color fill. Note that in order to
     *  do this, the path is broken into smaller pieces and a color scale is 
     *  applied to make a gradual change in color from one end to the other. 
     *  This significantly increases the number of SVG elements which can 
     *  affect overall performance.
     * @private
     * @param path {Chord} Chord to redraw with a gradient
     * @param i {number} index of the chord
     * @returns {Graph} this
     */
    private drawGradientPath(path, i: number): Graph 
    {
      let pathSVG = $('path.chord')[i.toString()],
          pathStr = $(pathSVG).attr('d'),
          arc_len1 = this.innerRadius * (path.source.endAngle -
            path.source.startAngle),
          arc_len2 = this.innerRadius * (path.target.endAngle -
            path.target.startAngle),
          pathCommands = pathStr.match(/[ACHLMQSTVZ][^ACHLMQSTVZ]*/gi),
          p0_str = pathCommands[1].split(' ')[3].split(','),
          p0 = { x: +(p0_str[0]), y: +(p0_str[1]) },
          p1 = { x: 0, y: 0 },
          p2_str = pathCommands[2].split(' ')[2].split(','),
          p2 = { x: +(p2_str[0]), y: +(p2_str[1]) },
          bezLen1 = bezierLength(p0, p1, p2),
          bezLen2 = pathSVG.getTotalLength() - arc_len1 - bezLen1 -
            arc_len2,
          epsilon1 = this.color_gradient_precision,
          n = Math.floor(bezLen1 / epsilon1),
          epsilon2 = bezLen2 / n,
          delta0 = pathSVG.getPointAtLength(0 + arc_len1),
          deltap0 = pathSVG.getPointAtLength(0),
          deltai = 0,
          deltapi = 0,
          mask = [],
          colorGradient = d3.scale.linear()
            .range([this.chord_fill( path.source.cluster ),
                   this.chord_fill( path.target.cluster )])
            .domain([0,n]);
      for (let i = 1; i < n; i++) {
        deltai = pathSVG.getPointAtLength(arc_len1 + epsilon1*i);
        deltapi = pathSVG.getPointAtLength(arc_len1 + bezLen1 +
          arc_len2 + epsilon2*(n - i));
        mask.push([delta0, deltai, deltapi, deltap0]);
        delta0 = deltai;
        deltap0 = deltapi;
      }
      deltai = pathSVG.getPointAtLength(arc_len1 + bezLen1);
      deltapi = pathSVG.getPointAtLength(arc_len1 + bezLen1 +
        arc_len2);
      mask.push([delta0, deltai, deltapi, deltap0]);
      d3.select('svg g').selectAll('chordMask')
          .data([path])
        .enter().append('g')
          .attr('class', 'chordMask')
          .attr('source', path.source.index)
          .attr('target', path.target.index)
        .selectAll('path.colorGradient')
          .data(mask)
        .enter().append('svg:path')
          .style('stroke', (d,i) => { return colorGradient(i); })
          .style('fill', (d,i) => { return colorGradient(i); })
          .attr('class', 'colorGradient')
          .attr('d', (d) => {
            return 'M' + d[3].x + ',' + d[3].y +
              'A' + this.innerRadius + ',' + this.innerRadius + ' 0 0,1 '
                + d[0].x + ',' + d[0].y + 'L' + d[1].x + ',' + d[1].y +
              'A' + this.innerRadius + ',' + this.innerRadius + ' 0 0,1 '
                + d[2].x + ',' + d[2].y + 'z';
          });
      return this;
    }

  } /* END GRAPH CLASS */

  
  /**
   * Returns a function that hides any chord that is not connected to the input
   *  chord data object
   * @param canvasHandle {d3.Selection<any>} Handle to the canvas on which the 
   *  chords are drawn
   * @param opacity {number} Number between 0 and 1 that indicates the opacity 
   *  of the hidden chords
   * @returns {(g,i) => void}
   */
  export function getFader(canvasHandle: d3.Selection<any>, opacity: number):
    (g, i) => void 
  {
    return (g, i) => {
      canvasHandle.selectAll('.chordMask, path.chord')
          .filter((d) => {
            return d.source.index !== g.index &&
              d.target.index !== g.index;
          })
        .transition()
          .style('opacity', opacity)
          .attr('visible', opacity === 1);
    };
  }
  
  /**
   * Returns a function that hides any chord that is not in the same cluster 
   *  as the input chord data object
   * @param canvasHandle {d3.Selection<any>} Handle to the canvas on which the 
   *  chords are drawn
   * @param opacity {number} Number between 0 and 1 that indicates the opacity 
   *  of the hidden chords
   * @returns {(g,i) => void}
   */
  export function getClusterFader(canvasHandle: d3.Selection<any>, opacity: 
    number): (g, i) => void 
  {
    return (g, i) => {
      canvasHandle.selectAll('.chordMask, path.chord')
          .filter((d) => {
            return d.source.cluster !== g.cluster &&
              d.target.cluster !== g.cluster
          })
        .transition()
          .style('opacity', opacity)
          .attr('visible', opacity === 1);
    };
  }
  
  /**
   * Returns a function that hides any chord that is not connected to the input
   *  chord object (for use with the 'click' event)
   * @param canvasHandle {d3.Selection<any>} Handle to the canvas on which the 
   *  chords are drawn
   * @param opacity {number} Number between 0 and 1 that indicates the opacity 
   *  of the hidden chords
   * @returns {(g,i) => void}
   */
  export function getToggleFader(canvasHandle: d3.Selection<any>, opacity: 
    number): (g, i) => void 
  {
    return (g, i) => {
      let h = canvasHandle.selectAll('.chordMask, path.chord')
            .filter((d) => { return d.source.index === g.index ||
               d.target.index === g.index; });
      if (parseInt(h.style('opacity')) === 1) {
        h.transition().style('opacity', opacity)
          .attr('visible', false);
      }
      else {
        h.transition().style('opacity', 1.0)
          .attr('visible', true);
      }
    }
  }
  
  /**
   * Returns a function that hides any chord that is not in the same cluster as
   *  the input chord object (for use with the 'click' event)
   * @param canvasHandle {d3.Selection<any>} Handle to the canvas on which the 
   *  chords are drawn
   * @param opacity {number} Number between 0 and 1 that indicates the opacity 
   *  of the hidden chords
   * @returns {(g,i) => void}
   */
  export function getToggleClusterFader(canvasHandle: d3.Selection<any>,
    opacity: number): (g, i) => void 
  {
    return (g, i) => {
      let h = canvasHandle.selectAll('.chordMask, path.chord')
          .filter((d) => { return d.source.cluster === g.cluster ||
            d.target.cluster === g.cluster; });
      if (parseInt(h.style('opacity')) === 1) {
        h.transition().style('opacity', opacity)
          .attr('visible', false);
      }
      else {
        h.transition().style('opacity', 1.0)
          .attr('visible', true);
      }
    }
  }
  
  /**
   * Returns a function that hides any heat map column whose related gene is 
   *  not connected to the given input heat map element
   * @param canvasHandle {d3.Selection<any>} Handle to the canvas on which the 
   *  chords are drawn
   * @param opacity {number} Number between 0 and 1 that indicates the opacity 
   *  of the hidden chords
   * @returns {(g,i) => void}
   */
  export function getHeatMapFader(canvasHandle: d3.Selection<any>, opacity: 
    number): (g, i) => void 
  {
    return (g, i) => {
      canvasHandle.selectAll('.tile')
        .filter((d) => {
          return d.index !== g.index && d.index !== g.index;
        })
        .transition()
          .style('opacity', opacity)
          .attr('visible', opacity === 1);
    };
  }
  
  /**
   * Returns a function that hides any heat map column whose related gene is 
   *  not in the same cluster as the given input heat map element
   * @param canvasHandle {d3.Selection<any>} Handle to the canvas on which the 
   *  chords are drawn
   * @param opacity {number} Number between 0 and 1 that indicates the opacity 
   *  of the hidden chords
   * @returns {(g,i) => void}
   */
  export function getHeatMapClusterFader(canvasHandle: d3.Selection<any>,
    opacity: number): (g, i) => void 
  {
    return (g, i) => {
      canvasHandle.selectAll('.tile')
        .filter((d) => {
          return d.cluster !== g.cluster && d.cluster !== g.cluster
        })
        .transition()
          .style('opacity', opacity)
          .attr('visible', opacity === 1);
    };
  }

  /**
   * Caculate the length of the Bezier Curve between the three input points
   * @param p0 {point} the first endpoint
   * @param p1 {point} the point in between p0 and p2
   * @param p2 {point} the second endpoint
   * @returns {number}
   */
  function bezierLength(p0: point, p1: point, p2: point): number 
  {
    let a = {
          x: p0.x - 2*p1.x + p2.x,
          y: p0.y - 2*p1.y + p2.y
        },
        b = {
          x: 2*p1.x - 2*p0.x,
          y: 2*p1.y - 2*p0.y
        },
        A = 4*(a.x*a.x + a.y*a.y),
        B = 4*(a.x*b.x + a.y*b.y),
        C = b.x*b.x + b.y*b.y,
        Sabc = 2*Math.sqrt(A+B+C),
        A_2 = Math.sqrt(A),
        A_32 = 2*A*A_2,
        C_2 = 2*Math.sqrt(C),
        BA = B/A_2;
    return (A_32*Sabc +
            A_2*B*(Sabc-C_2) +
            (4*C*A - B*B) * Math.log( (2*A_2 + BA + Sabc) / (BA + C_2) )
           ) / (4*A_32);
  }

} /* END CHEM NAMESPACE */

export = CHeM;
