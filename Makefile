.PHONY: test backend-test frontend-typecheck

test: backend-test frontend-typecheck

backend-test:
	cd backend && python -m unittest discover -s tests -v

frontend-typecheck:
	npm run type-check
