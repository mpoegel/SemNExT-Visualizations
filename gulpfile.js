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
    glob = require('glob'),
    es = require('event-stream'),
    fs = require('fs'),
    nodemon = require('gulp-nodemon');

var ts_project = ts.createProject('./src/tsconfig.json');

gulp.task('default', ['watch', 'nodemon']);

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
  var ts_result = ts_project.src().pipe( ts(ts_project) );
  return ts_result.js.pipe(gulp.dest('./src'));
});

// clean up the generated javascript files
gulp.task('clean:ts', function() {
  var files = [
    './src/**/*.js',
    './analysis/**/*.js'
  ]
  del(files);
  return gulp;
});

// watch typescript files for changes and recompile
gulp.task('watch', function() {
  gulp.watch(
    [
      './src/*.ts', 
      './src/**/*.ts', 
    ], 
    ['bundle-js']
  );
});

// start the node server
gulp.task('nodemon', function() {
  nodemon({ script: './src/server.js' });
});

gulp.task('bundle-js', ['ts'], function(done) {
  var files = glob.sync('./src/client/script/**/*.js'),
      tasks = [];
  for (var f in files) {
    var file_path = files[f].split('/'),
        file = file_path[ file_path.length -1 ];
    var b = browserify({
      entries: file_path.slice(0, file_path.length-1).join('/') + '/' + file,
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

gulp.task('bundle-css', function() {
  var files = fs.readFileSync('./src/client/style/dependencies', 'utf8')
                .split('\n');
  return gulp
    .src(files, { base: './node_modules/' })
    .pipe(gulp.dest('./src/public/style/'));
});
