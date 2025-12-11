# MicroNote - Docker Makefile
# Quick commands for managing the microservices

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

## Help
help: ## Show this help message
	@echo "$(BLUE)MicroNote Docker Commands$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(RESET)\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-15s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## Development
dev: ## Start all services in development mode
	@echo "$(BLUE)🚀 Starting MicroNote in development mode...$(RESET)"
	docker-compose up --build -d
	@echo "$(GREEN)✅ Services starting! Check http://localhost$(RESET)"

dev-logs: ## View logs from all services
	@echo "$(BLUE)📊 Viewing all service logs...$(RESET)"
	docker-compose logs -f

dev-stop: ## Stop all development services
	@echo "$(YELLOW)🛑 Stopping development services...$(RESET)"
	docker-compose down
	@echo "$(GREEN)✅ All services stopped$(RESET)"

## Production
prod: ## Start all services in production mode
	@echo "$(BLUE)🚀 Starting MicroNote in production mode...$(RESET)"
	docker-compose -f docker-compose.yml up --build -d
	@echo "$(GREEN)✅ Production services started!$(RESET)"

prod-logs: ## View production logs
	@echo "$(BLUE)📊 Viewing production logs...$(RESET)"
	docker-compose logs -f

prod-stop: ## Stop production services
	@echo "$(YELLOW)🛑 Stopping production services...$(RESET)"
	docker-compose down
	@echo "$(GREEN)✅ Production services stopped$(RESET)"

## Database
db-shell: ## Access MySQL shell
	@echo "$(BLUE)🗄️ Opening MySQL shell...$(RESET)"
	docker-compose exec mysql mysql -u micronote_user -p micronote

db-backup: ## Create database backup
	@echo "$(BLUE)💾 Creating database backup...$(RESET)"
	docker-compose exec mysql mysqldump -u root -p micronote > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Database backup created$(RESET)"

redis-cli: ## Access Redis CLI
	@echo "$(BLUE)🔄 Opening Redis CLI...$(RESET)"
	docker-compose exec redis redis-cli

## Services
restart-auth: ## Restart auth service
	@echo "$(YELLOW)🔄 Restarting auth service...$(RESET)"
	docker-compose restart auth-service

restart-notes: ## Restart notes service
	@echo "$(YELLOW)🔄 Restarting notes service...$(RESET)"
	docker-compose restart notes-service

restart-todos: ## Restart todos service
	@echo "$(YELLOW)🔄 Restarting todos service...$(RESET)"
	docker-compose restart todos-service

restart-users: ## Restart user service
	@echo "$(YELLOW)🔄 Restarting user service...$(RESET)"
	docker-compose restart user-service

restart-gateway: ## Restart API gateway
	@echo "$(YELLOW)🔄 Restarting API gateway...$(RESET)"
	docker-compose restart api-gateway

restart-frontend: ## Restart frontend
	@echo "$(YELLOW)🔄 Restarting frontend...$(RESET)"
	docker-compose restart frontend

## Monitoring
status: ## Show status of all services
	@echo "$(BLUE)📊 Service Status:$(RESET)"
	docker-compose ps

health: ## Check health of all services
	@echo "$(BLUE)🏥 Checking service health...$(RESET)"
	@curl -s http://localhost:8080/health | jq . || echo "$(RED)❌ API Gateway not responding$(RESET)"
	@curl -s http://localhost:3001/health | jq . || echo "$(RED)❌ Auth Service not responding$(RESET)"
	@curl -s http://localhost:3002/health | jq . || echo "$(RED)❌ Notes Service not responding$(RESET)"
	@curl -s http://localhost:3003/health | jq . || echo "$(RED)❌ Todos Service not responding$(RESET)"
	@curl -s http://localhost:3004/health | jq . || echo "$(RED)❌ User Service not responding$(RESET)"

logs-auth: ## View auth service logs
	docker-compose logs -f auth-service

logs-notes: ## View notes service logs
	docker-compose logs -f notes-service

logs-todos: ## View todos service logs
	docker-compose logs -f todos-service

logs-users: ## View user service logs
	docker-compose logs -f user-service

logs-gateway: ## View API gateway logs
	docker-compose logs -f api-gateway

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

## Scaling
scale-notes: ## Scale notes service to 3 instances
	@echo "$(BLUE)📈 Scaling notes service...$(RESET)"
	docker-compose up -d --scale notes-service=3

scale-todos: ## Scale todos service to 3 instances
	@echo "$(BLUE)📈 Scaling todos service...$(RESET)"
	docker-compose up -d --scale todos-service=3

scale-down: ## Scale all services back to 1 instance
	@echo "$(BLUE)📉 Scaling down services...$(RESET)"
	docker-compose up -d --scale notes-service=1 --scale todos-service=1

## Cleanup
clean: ## Clean up containers, networks, and images
	@echo "$(YELLOW)🧹 Cleaning up Docker resources...$(RESET)"
	docker-compose down --rmi all -v --remove-orphans
	docker system prune -f
	@echo "$(GREEN)✅ Cleanup complete$(RESET)"

reset: ## Reset everything (⚠️ deletes all data)
	@echo "$(RED)⚠️ This will delete ALL data. Are you sure? [y/N]$(RESET)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)🔄 Resetting all services and data...$(RESET)"
	docker-compose down -v --remove-orphans
	docker system prune -af --volumes
	@echo "$(GREEN)✅ Reset complete$(RESET)"

## Quick Access
shell-auth: ## Open shell in auth service container
	docker-compose exec auth-service sh

shell-notes: ## Open shell in notes service container
	docker-compose exec notes-service sh

shell-todos: ## Open shell in todos service container
	docker-compose exec todos-service sh

shell-users: ## Open shell in user service container
	docker-compose exec user-service sh

shell-gateway: ## Open shell in API gateway container
	docker-compose exec api-gateway sh

## Testing
test: ## Run basic health checks
	@echo "$(BLUE)🧪 Running basic tests...$(RESET)"
	@echo "Testing API Gateway..."
	@curl -f http://localhost:8080/health >/dev/null && echo "$(GREEN)✅ API Gateway OK$(RESET)" || echo "$(RED)❌ API Gateway Failed$(RESET)"
	@echo "Testing Frontend..."
	@curl -f http://localhost >/dev/null && echo "$(GREEN)✅ Frontend OK$(RESET)" || echo "$(RED)❌ Frontend Failed$(RESET)"

.PHONY: help dev dev-logs dev-stop prod prod-logs prod-stop db-shell db-backup redis-cli status health clean reset test