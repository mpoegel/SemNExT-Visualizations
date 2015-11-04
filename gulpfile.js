'use strict';

var gulp = require('gulp'),
	browserify = require('browserify'),
	del = require('del'),
	exec = require('child_process').exec,
	ts = require('gulp-typescript'),
	source = require('vinyl-source-stream'),
	uglify = require('gulp-uglify'),
	buffer = require('vinyl-buffer'),
	sourcemaps = require('gulp-sourcemaps'),
	gutil = require('gulp-util'),
	// globby = require('globby'),
	// through = require('through2'),
	glob = require('glob'),
	es = require('event-stream'),
	nodemon = require('gulp-nodemon');

var ts_project = ts.createProject('./src/tsconfig.json');

gulp.task('default', ['ts', 'bundle-js', 'bundle-css', 
	'watch', 'nodemon']);

// download the types definitions from definitely typed
gulp.task('tsd', function(cb) {
	exec('tsd reinstall --save --overwrite', function(err, stdout, stderr) {
		console.log(stdout);
		console.error(stderr);
		cb(err);
	});
	return gulp;
});

// compile the typescript source
gulp.task('ts', function() {
	var ts_result = ts_project.src()
		.pipe(ts(ts_project));
	return ts_result.js.pipe(gulp.dest('./src'));
});

// clean up the generated javascript files
gulp.task('clean:ts', function() {
	var files = [
		'./src/*.js',
		'./src/*/*.js',
		'./src/public/script/*',
		'./analysis/*.js'
	]
	del(files);
	return gulp;
});

// watch typescript files for changes and recompile
gulp.task('watch', function() {
	gulp.watch(
		[
			'./src/*.ts', 
			'./src/*/*.ts', 
			'./src/public/script/*.ts'
		], 
		['ts', 'bundle-js']
	);
});

// start the node server
gulp.task('nodemon', ['ts', 'watch'], function() {
	nodemon({ script: './src/server.js' });
});

gulp.task('bundle-js', function(done) {
	var files = glob.sync('./src/client/script/*.js'),
		tasks = [];
	for (var f in files) {
		var file_path = files[f].split('/'),
			file = file_path[ file_path.length -1 ];
		var b = browserify({
			entries: './src/client/script/' + file,
			debug: true
		});
		tasks.push(b.bundle()
			.pipe(source(file))
			.pipe(buffer())
			.pipe(sourcemaps.init({loadMaps: true}))
				.pipe(uglify())
				.on('error', gutil.log)
			.pipe(sourcemaps.write('./'))
			.pipe(gulp.dest('./src/public/script/')));
	}	
	return es.merge(tasks);	
});

// bundle the application for deployment
gulp.task('bundle-css', function() {
	var client_deps = [
		{
			src: 'bootstrap/dist/*/*',
			dest: 'style/bootstrap'
		},
		{
			src: 'font-awesome/css/font-awesome.min.css',
			dest: 'style/font-awesome/css'
		},
		{
			src: 'font-awesome/fonts/*',
			dest: 'style/font-awesome/fonts'
		}
	];
	client_deps.forEach(function(dep) {
		gulp
			.src('./node_modules/' + dep.src)
			.pipe(gulp.dest('./src/public/' + dep.dest));
	}, this);
	return gulp;
});