.PHONY: all test

install:
	npm install

test:
	npm run build
	npx prettier --check .
	npx eslint **/*.ts --quiet
	npx jest --coverage 

watch:
	npm run watch




