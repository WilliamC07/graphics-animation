all:
	npm install --save-dev @types/node
	tsc
	node src/index.js script.mdl

dev:
	node src/index.js script.mdl

myscript:
	echo "myscript running"
	node myscript-generator.js
