const fs = require('fs');
const path = require('path');

console.log('---- ' + path.basename(__filename) + '\n');

const gamesDataJsPath = path.join(__dirname, 'js', 'GamesData.js');
const mainGamesJsonPath = path.join(__dirname, '../..', 'games.json'); // airbattle-hosting/games.json
const localGamesJsonPath = path.join(__dirname, '..', 'games.json'); // ab-frontend/games.json

let gamesJsonPath;

// the way this should work:
// ab-frontend has the only games.json.example file
// when running setup for airbattle-hosting, the example file is copied to ab-frontend/games.json
//   and that file is symlinked to airbattle-hosting/games.json
if (fs.existsSync(mainGamesJsonPath)) {
	gamesJsonPath = mainGamesJsonPath;
	console.log('Using games.json from airbattle-hosting');
} else if (fs.existsSync(localGamesJsonPath)) {
	gamesJsonPath = localGamesJsonPath;
	console.log('Using games.json from ab-frontend');
} else {
	console.error('games.json not found:', mainGamesJsonPath, localGamesJsonPath);
	process.exit(1);
}

let data = [];

try {
	const jsonData = fs.readFileSync(gamesJsonPath, 'utf8');
	data = JSON.parse(jsonData);
	if (!Array.isArray(data) && typeof data === 'object') {
		data = [data];
	}
} catch (err) {
	console.error('Error reading games.json:', err);
	process.exit(1);
}

const js = 'export const defaultGamesData = ' + JSON.stringify(data) + ';';

console.log(gamesDataJsPath + ':');
console.log(js);

try {
	fs.writeFileSync(gamesDataJsPath, js);
	console.log('File written successfully');
} catch (err) {
	console.error('Error writing to GamesData.js:', err);
	process.exit(1);
}
