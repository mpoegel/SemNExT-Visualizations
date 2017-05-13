'use strict';

var gulp = require('gulp'),
    browserify = require('browserify'),
    del = require('del'),
    exec = require('child_process').exec,
    source = require('vinyl-source-stream'),
    uglify = require('gulp-uglify'),
    buffer = require('vinyl-buffer'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util'),
    glob = require('glob'),
    es = require('event-stream'),
    fs = require('fs'),
    nodemon = require('gulp-nodemon');


gulp.task('default', ['watch', 'nodemon']);

// compile the typescript source
gulp.task('ts', function(cb) {
  exec('tsc -p src', function(err, stdout, stderr) {
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
    cb(err);
  });
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
      .pipe(gulp.dest('./public/script/')));
  }
  return es.merge(tasks);  
});

gulp.task('bundle-css', function() {
  var files = fs.readFileSync('./src/client/style/dependencies', 'utf8')
                .split('\n');
  return gulp
    .src(files, { base: './node_modules/' })
    .pipe(gulp.dest('./public/style/'));
});
