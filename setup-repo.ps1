#!/usr/bin/env pwsh

# is nvm installed?
if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
	Write-Output "nvm could not be found"
	exit
}

# is node v12 installed?
$nvmList = nvm list
if ($nvmList -notmatch "v12") {
	Write-Output "node is not v12"
	exit
}

git pull --recurse-submodules

# node_modules?
if (-Not (Test-Path -Path "node_modules")) {
	npm install
}

# update-games-data relies on games.json
if (-Not (Test-Path -Path "games.json")) {
	Copy-Item -Path "games.json.example" -Destination "games.json"
	Write-Output "games.json created - please run the following to edit:"
	Write-Output "notepad games.json"
}

# have had to run these separate on windows
node src/update-version
node src/update-games-data
npx --yes patch-package
npx --yes webpack
