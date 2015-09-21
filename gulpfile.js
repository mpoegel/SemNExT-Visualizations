var gulp = require('gulp'),
	del = require('del'),
	exec = require('child_process').exec,
	ts = require('gulp-typescript'),
	browserify = require('browserify'),
	source = require('vinyl-source-stream'),
	nodemon = require('gulp-nodemon');

var ts_project = ts.createProject('./src/tsconfig.json');

gulp.task('default', ['tsd', 'ts', 'browserify', 'bundle', 'watch', 'nodemon']);

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
	return ts_result.js.pipe(gulp.dest('./wwwroot'));
});

// clean up the generated javascript files
gulp.task('clean:ts', function() {
	var files = [
		'./wwwroot/*.js',
		'./wwwroot/public/script/*.js'
	]
	del(files);
	return gulp;
});

// watch typescript files for changes and recompile
gulp.task('watch', function() {
	gulp.watch('./src/*', ['ts']);
});

// start the node server
gulp.task('nodemon', ['ts', 'watch'], function() {
	nodemon({ script: './wwwroot/server.js' });
});

// bundle any commonjs deps using browserify
gulp.task('browserify', function() {
	return browserify('./node_modules/typeahead/typeahead.js')
		.bundle()
		.pipe(source('typeahead.bundle.js'))
		.pipe(gulp.dest('./node_modules/typeahead'));
});

// bundle the application for deployment
gulp.task('bundle', function() {
	var client_deps = [
		{
			src: 'bootstrap/dist/*/*',
			dest: 'lib/bootstrap'
		},
		{
			src: 'd3/d3.min.js',
			dest: 'lib/d3'
		},
		{
			src: 'font-awesome/css/font-awesome.min.css',
			dest: 'lib/font-awesome/css'
		},
		{
			src: 'font-awesome/fonts/*',
			dest: 'lib/font-awesome/fonts'
		},
		{
			src: 'jquery/dist/jquery.min.js',
			dest: 'lib/jquery'
		},
		{
			src: 'typeahead/typeahead.bundle.js',
			dest: 'lib/typeahead'
		},
		{
			src: 'underscore/underscore-min.js',
			dest: 'lib/underscore'
		}
	];
	client_deps.forEach(function(dep) {
		gulp
			.src('./node_modules/' + dep.src)
			.pipe(gulp.dest('./wwwroot/public/' + dep.dest));
	}, this);
	return gulp;
});