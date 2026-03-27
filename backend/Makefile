.PHONY: setup up down queues migrate seed dev test test-e2e reset

setup:
	cp -n .env.example .env || true
	npm install

up:
	docker-compose -f infrastructure/docker-compose.yml up -d

down:
	docker-compose -f infrastructure/docker-compose.yml down

queues:
	node infrastructure/localstack-init/setup.mjs

migrate:
	npm run migrate

seed:
	npm run seed

dev:
	npm run dev

test:
	npm test

test-e2e:
	npm run test:e2e

reset:
	docker-compose -f infrastructure/docker-compose.yml down -v
	docker-compose -f infrastructure/docker-compose.yml up -d
	sleep 10
	node infrastructure/localstack-init/setup.mjs
	npm run migrate
	npm run seed
