/// <reference path="../../../typings/tsd.d.ts"/>

module CHeM {

	interface margin {
		top: number;
		bottom: number;
		right: number;
		left: number;
	}

	interface cluster_band {
		genes: string[];
		endAngle: number;
		startAngle: number;
		cluster: number;
	}

	interface point {
		x: number;
		y: number;
	}

	export class Canvas {
		private $handle: d3.Selection<any>;
		private svg: any;
		private margins: margin;
		private width: number;
		private adj_width: number;
		private height: number;
		private adj_height: number;

		constructor($handle: d3.Selection<any>, margins: margin, width: number,
								height: number) {
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
					.attr('transform', 'translate(' +
						(this.adj_width / 2 + this.margins.left) + ',' +
						(this.adj_height / 2 + this.margins.top) + ')');
		}

		getSVG(): any { return this.svg; }
		getWidth(): number { return this.width; }
		getAdjWidth(): number { return this.adj_width; }
		getHeight(): number { return this.height; }
		getAdjHeight(): number { return this.adj_height; }
		getMargins(): margin { return this.margins; }
		getHandle(): d3.Selection<any> { return this.$handle; }

		clear(): void {
			this.$handle.selectAll('svg g *').remove();
		}

	}

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

		static clusterToStage = ['Pluripotency', 'Ectoderm',
			'Neural Differentiation', 'Cortical Specification', 'Early Layers',
			'Upper Layers'];

		getCanvas(): Canvas { return this.canvas; }
		getData(): Munge.chem_data { return this.data; }
		getFadeOpacity(): number { return this.fade_opacity; }

		constructor(data: Munge.chem_data, canvas: Canvas, chord_padding = 0.02,
								heatmap_height = 100, fade_opacity = 0.02,
								cluster_band_width = 20, color_gradient_precision = 20) {
			this.data = data;
			this.canvas = canvas;
			this.svg = this.canvas.getSVG();
			this.innerRadius = Math.min(this.canvas.getAdjWidth(),
				this.canvas.getAdjHeight()) *	0.41;
			this.outerRadius = this.innerRadius * 1.07;
			this.chord_padding = chord_padding;
			this.heatmap_height = heatmap_height;
			this.fade_opacity = fade_opacity;
			this.cluster_band_width = cluster_band_width;
			this.color_gradient_precision = color_gradient_precision;

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
			this.heatmapColorScale = d3.scale.linear<string, number>()
				.range(['#232323', 'green', 'red'])
				.domain([mu - 2 * sd, mu, mu + 2 * sd]);

			// initialize more scales
			this.heatmapLegendScale = d3.scale.linear()
				.domain([0,3])
				.range(this.heatmapColorScale.domain());
			this.heatmapYScale = d3.scale.ordinal()
				.rangeRoundBands([0, this.heatmap_height])
				.domain(this.data.heatmap.map((d) => { return d.day; }));
		}

		drawChords(): Graph {
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
					.on('mouseover', getFader(this.canvas.getHandle(),
						this.fade_opacity))
					.on('mouseout', getFader(this.canvas.getHandle(), 1.00));
			// draw the group arcs and colors them
			g.append('svg:path')
					.style('stroke', (d) => {
						return Graph.d3Cat10Colors(this.data.clusters[d.index]);
					})
					.style('fill', (d) => {
						return Graph.d3Cat10Colors(this.data.clusters[d.index]);
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
						return d3.rgb(Graph.d3Cat10Colors(this.data.clusters[d.source.index]))
							.darker();
					})
					.style('fill', (d) => {
						return Graph.d3Cat10Colors(this.data.clusters[d.source.index]);
					})
					.attr('d', d3.svg.chord().radius(this.innerRadius));
				return this;
		}

		drawClusterBands(): Graph {
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
					.attr('fill', (d) => { return Graph.d3Cat10Colors(d.cluster); })
					.on('mouseover', getClusterFader(this.canvas.getHandle(),
						this.fade_opacity))
					.on('mouseout', getClusterFader(this.canvas.getHandle(), 1.00));
			return this;
		}

		drawTextLabels(): Graph {
			// add gene labels
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

		drawCircularHeatmap(): Graph {
			// draw the heatmap around the chord the chord diagram
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

		drawClusterLegend(): Graph {
			let legend = this.svg.append("g")
					.attr("class", "clusterLegend")
					.attr("transform", "translate(" + (this.canvas.getAdjWidth() / 2 +
						this.canvas.getMargins().top * 0.30) + "," +
						(- this.canvas.getAdjHeight() / 2 - this.canvas.getMargins().right *
						0.90) + ")")
					.attr("height", 100)
					.attr("width", 100)
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
							.style("fill", Graph.d3Cat10Colors(d));
						g.append("text")
							.attr("x", 40)
							.attr("y", i*20 + 10)
							.attr("height", 30)
							.attr("width", 100)
							.attr("fill", '#000')
							.attr("text-anchor", "end")
							.style("font-size", "16px")
							.text(Graph.clusterToStage[i]);
					});
			return this;
		}

		drawHeatmapLegend(): Graph {
			let self = this,
					legend = self.svg.append("g")
						.attr("class", "heatmapLegend")
						.attr("transform", "translate(" + (- self.canvas.getAdjWidth() / 2 -
							self.canvas.getMargins().top * 0.30) + "," +
							(- self.canvas.getAdjHeight() / 2 - self.canvas.getMargins().left *
							0.90) + ")")
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
							.attr("y", d*20+15)
							.text(Math.round(self.heatmapLegendScale(d) * 10000) / 10000 );
					});
			return self;
		}

		drawTitle(): Graph {
			// add a title to the top
			this.svg.append("text")
					.attr("class", "title")
					.attr("transform", "translate(0," + (-this.canvas.getAdjHeight() / 2 -
					 	this.canvas.getMargins().top * 0.80) + ")")
					.attr("text-anchor", "middle")
					.style("font-size", "32px")
					.style("font-family", "Arial, Helvetica, sans-serif")
					.text(this.data.title);
			return this;
		}

		recolor(fill: (i) => string): Graph {
			d3.selectAll('path.chord')
				.style('fill', (d) => {
					return fill(this.data.clusters[d.source.index]);
				})
				.style('stroke', (d) => {
					return fill(this.data.clusters[d.source.index]);
				});
			_.each($('.chordMask'), (d) => {
				let gradient = d3.scale.linear<string, number>()
					.range([fill(this.data.clusters[$(d).attr('source')]),
									fill(this.data.clusters[$(d).attr('target')])])
					.domain([0, $(d).children().length]);
				$(d).children().each((i) => {
					$(i).css('fill', gradient(i))
							.css('stroke', gradient(i));
				});
			});
			d3.selectAll('g.group path')
				.style('fill', (d) => { return fill(this.data.clusters[d.index]); })
				.style('stroke', (d) => { return fill(this.data.clusters[d.index]); })
			d3.selectAll('.cluster-arc')
				.style('fill', (d) => { return fill(d.cluster); });
			d3.selectAll('.clusterLegend g rect')
				.style('fill', (d) => { return fill(d); });
			return this;
		}

		drawGradientPaths(): Graph {
			this.svg.selectAll('path.chord')
				.each((d, i) => { this.drawGradientPath(d, i); })
				.remove();
			return this;
		}

		private drawGradientPath(path, i: number): Graph {
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
					colorGradient = d3.scale.linear<string, number>()
						.range([Graph.d3Cat10Colors( path.source.cluster ),
									 Graph.d3Cat10Colors( path.target.cluster )])
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

	} // end Graph class

	export function getFader(canvasHandle: d3.Selection<any>, opacity: number): (g, i) => void {
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

	export function getClusterFader(canvasHandle: d3.Selection<any>, opacity: number): (g, i) => void {
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

	export function getToggleFader(canvasHandle: d3.Selection<any>, opacity: number): (g, i) => void {
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

	export function getToggleClusterFader(canvasHandle: d3.Selection<any>, opacity: number):
																			  (g, i) => void {
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

	function bezierLength(p0: point, p1: point, p2: point) {
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

}
