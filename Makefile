.PHONY: all test

install:
	npm install

test:
	npm run build
	npx prettier --check .
	npx jest --coverage

watch:
	npm run watch




