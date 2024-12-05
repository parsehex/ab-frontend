const fs = require('fs');
const path = require('path');

console.log('---- ' + path.basename(__filename) + '\n');

const gamesDataJsPath = path.join(__dirname, 'js', 'GamesData.js');
const gamesJsonPath = path.join(__dirname, '..', 'games.json');

let data = [];

try {
	const jsonData = fs.readFileSync(gamesJsonPath, 'utf8');
	data = JSON.parse(jsonData);
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
