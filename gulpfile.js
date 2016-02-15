var gulp = require('gulp'),
	autoprefixer = require('gulp-autoprefixer'),
	cssnano = require('gulp-cssnano'),
	uglify = require('gulp-uglify'),
	concat = require('gulp-concat'),
	rename = require('gulp-rename'),
	merge = require('merge-stream'),
	mainBowerFiles = require('main-bower-files'),
	processHTML = require('gulp-processhtml'),
	rm = require('gulp-rimraf'),
	gulpsync = require('gulp-sync')(gulp);

// Overall build process - cleans dist then rebuilds
gulp.task('build', gulpsync.sync(['clean-dist', 'build-dist']));

gulp.task('clean-dist', function() {
    return gulp.src('dist/*').pipe(rm());
});
gulp.task('build-dist', ['HTML', 'styles', 'js']);

// HTML (update JS/CSS links)
gulp.task('HTML', function() {
	return gulp.src('src/*.html')
		.pipe(processHTML())
	    .pipe(gulp.dest('dist'));
});

// Styles (both should always be run together or FA will not work properly as missing font files)
gulp.task('styles', ['styles-css', 'styles-fonts']);

gulp.task('styles-css', function() {
	var main = gulp.src('src/styles/*.css');
	var bower = gulp.src(mainBowerFiles('**/*.css'));

	return merge(main, bower)
		.pipe(concat('all-styles.min.css'))
		.pipe(autoprefixer({
					browsers: ['last 2 versions'],
					cascade: false
				}))
		.pipe(cssnano())
		.pipe(gulp.dest('dist/styles/'));
});

gulp.task('styles-fonts', function () {
	return gulp.src('bower_components/font-awesome/fonts/*')
		.pipe(gulp.dest('dist/fonts'));
});

// js
gulp.task('js', function() {
	var main = gulp.src('src/js/*.js');
	var bower = gulp.src(mainBowerFiles('**/*.js'));

	return merge(main, bower)
		.pipe(concat('all-js.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('dist/js/'));
});

// Overall build process
gulp.task('build', gulpsync.sync(['clean-dist', 'build-dist']));
gulp.task('clean-dist', function() {
    return gulp.src('dist/*').pipe(rm());
});
gulp.task('build-dist', ['HTML', 'styles', 'js']);