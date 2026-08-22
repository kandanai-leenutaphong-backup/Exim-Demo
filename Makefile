PYTHON ?= python3

.PHONY: generate test-backend test-frontend demo-check demo-check-cached seed seed-search

generate:
	$(PYTHON) datagen/generate_claimpilot_data.py

test-backend:
	cd backend && PYTHONPATH=. $(PYTHON) -m pytest -q

test-frontend:
	cd frontend && npm run build

demo-check:
	cd backend && DEMO_CHECK_LIVE=1 $(PYTHON) ../scripts/demo_check.py

demo-check-cached:
	cd backend && DEMO_CHECK_LIVE=0 $(PYTHON) ../scripts/demo_check.py
	$(PYTHON) scripts/verify_no_secrets.py

seed:
	cd backend && $(PYTHON) ../scripts/reset_cosmos.py

seed-search:
	cd backend && $(PYTHON) ../scripts/seed_search.py
