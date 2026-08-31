This file is intentionally temporary and will be removed in the CI hardening change.

The Business Portal has a committed package-lock.json (lockfileVersion 3) and the existing CI currently uses npm install. The production validation gate is a Vite build. CI hardening should use npm ci so the lockfile is the deterministic dependency contract.
