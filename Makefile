.PHONY: setup dev backend frontend test lint seed index

setup:
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install
	@test -f .env || cp .env.example .env
	@echo "Edit .env with your sandbox credentials."

backend:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	@echo "Run 'make backend' and 'make frontend' in two terminals."

test:
	cd backend && . .venv/bin/activate && pytest -q

lint:
	cd backend && . .venv/bin/activate && ruff check .

index:
	cd backend && . .venv/bin/activate && python scripts/build_index.py

seed:
	cd backend && . .venv/bin/activate && python scripts/seed_sandbox.py
