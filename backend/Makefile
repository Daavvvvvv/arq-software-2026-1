.PHONY: setup up down migrate seed dev test test-e2e reset obs-up obs-down

setup:
	cp -n .env.example .env || true
	npm install

up:
	docker-compose -f infrastructure/docker-compose.yml up -d

down:
	docker-compose -f infrastructure/docker-compose.yml down

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
	npm run migrate
	npm run seed

obs-up:
	docker-compose -f infrastructure/docker-compose.yml up -d prometheus loki tempo grafana

obs-down:
	docker-compose -f infrastructure/docker-compose.yml stop prometheus loki tempo grafana
