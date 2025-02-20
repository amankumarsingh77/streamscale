MIGRATIONS_PATH := ./cmd/migrations

# Construct the DB URL from config.yml using yq
DB_URL := $(shell yq eval '"postgres://" + .postgres.user + ":" + .postgres.password + "@" + .postgres.host + ":" + (.postgres.port | tostring) + "/" + .postgres.name + "?sslmode=require"' config.yml)

# Create a new migration file
.PHONY: migrate-create
migrate-create:
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "Please specify a migration name (e.g., make migrate-create migration_name)"; \
		exit 1; \
	fi
	@migrate create -seq -ext sql -dir $(MIGRATIONS_PATH) $(filter-out $@,$(MAKECMDGOALS))

# Apply all up migrations
.PHONY: migrate-up
migrate-up:
	@migrate -path=$(MIGRATIONS_PATH) -database "$(DB_URL)" up

# Apply down migrations
.PHONY: migrate-down
migrate-down:
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "Please specify the number of migrations to revert (e.g., make migrate-down 1)"; \
		exit 1; \
	fi
	@migrate -path=$(MIGRATIONS_PATH) -database "$(DB_URL)" down $(filter-out $@,$(MAKECMDGOALS))

# Print the constructed database configuration
.PHONY: print-config
print-config:
	@echo "DB URL: $(DB_URL)"

# Allow additional arguments for dynamic targets
%:
	@:
