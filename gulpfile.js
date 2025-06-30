const gulp = require('gulp');
const { exec } = require('child_process');
const path = require('path');

function copyIcons() {
	return gulp.src('nodes/**/*.{png,svg}')
		.pipe(gulp.dest('dist/nodes'));
}

function packageAndCopy(cb) {
	// Create the tarball using pnpm pack
	exec('pnpm pack', (error, stdout, stderr) => {
		if (error) {
			console.error(`Error creating package: ${error}`);
			return cb(error);
		}
		
		console.log('Package created successfully');
		
		// Copy the tarball to n8n local test directory
		const sourceFile = 'n8n-nodes-semble-1.0.0.tgz';
		const targetDir = '../n8n-local-test/';
		const targetFile = path.join(targetDir, sourceFile);
		
		exec(`cp ${sourceFile} ${targetFile}`, (copyError, copyStdout, copyStderr) => {
			if (copyError) {
				console.error(`Error copying package: ${copyError}`);
				return cb(copyError);
			}
			
			console.log(`Package copied to ${targetFile}`);
			cb();
		});
	});
}

exports['build:icons'] = copyIcons;
exports['package:local'] = packageAndCopy;
exports['build:complete'] = gulp.series(copyIcons, packageAndCopy);
