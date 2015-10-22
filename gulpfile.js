var gulp = require('gulp'),
	del = require('del'),
	exec = require('child_process').exec,
	ts = require('gulp-typescript'),
	source = require('vinyl-source-stream'),
	nodemon = require('gulp-nodemon');

var ts_project = ts.createProject('./src/tsconfig.json');

gulp.task('default', ['tsd', 'ts', 'bundle', 'watch', 'nodemon']);

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
		'./src/public/script/*.js'
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
		['ts']
	);
});

// start the node server
gulp.task('nodemon', ['ts', 'watch'], function() {
	nodemon({ script: './src/server.js' });
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
			src: 'typeahead.js/dist/typeahead.bundle.js',
			dest: 'lib/typeahead'
		},
		{
			src: 'underscore/underscore-min.js',
			dest: 'lib/underscore'
		},
		{
			src: 'velocity-animate/velocity.min.js',
			dest: 'lib/velocity'
		}
	];
	client_deps.forEach(function(dep) {
		gulp
			.src('./node_modules/' + dep.src)
			.pipe(gulp.dest('./src/public/' + dep.dest));
	}, this);
	return gulp;
});