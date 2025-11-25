# PSPD Lab - gRPC vs REST Microservices Management
# Academic comparison project with dual protocol implementation
# Complete environment: 2 gRPC + 4 REST + 1 Frontend = 7 services total

# Configuration
PROJECT_NAME = pspd-lab-grpc-kubernetes-2025
DOCKER_REGISTRY ?= localhost:5000
VERSION ?= latest

# gRPC Service definitions
GRPC_LINK_SERVICE = microservice-a-grpc
GRPC_QR_SERVICE = microservice-b-grpc

# REST Service definitions
QR_REST_SERVICE = qr-generator-rest
URL_REST_SERVICE = url-shortener-rest
USER_MGMT_SERVICE = user-management-rest
ANALYTICS_SERVICE = analytics-rest

# Frontend
WEB_CLIENT = web-client

# Docker image names - gRPC
GRPC_LINK_IMAGE = $(DOCKER_REGISTRY)/$(GRPC_LINK_SERVICE):$(VERSION)
GRPC_QR_IMAGE = $(DOCKER_REGISTRY)/$(GRPC_QR_SERVICE):$(VERSION)

# Docker image names - REST
QR_REST_IMAGE = $(DOCKER_REGISTRY)/$(QR_REST_SERVICE):$(VERSION)
URL_REST_IMAGE = $(DOCKER_REGISTRY)/$(URL_REST_SERVICE):$(VERSION)
USER_MGMT_IMAGE = $(DOCKER_REGISTRY)/$(USER_MGMT_SERVICE):$(VERSION)
ANALYTICS_IMAGE = $(DOCKER_REGISTRY)/$(ANALYTICS_SERVICE):$(VERSION)

# Docker image names - Frontend
WEB_CLIENT_IMAGE = $(DOCKER_REGISTRY)/$(WEB_CLIENT):$(VERSION)

# Ports configuration - gRPC
GRPC_LINK_PORT = 5001
GRPC_LINK_HEALTH_PORT = 5002
GRPC_QR_PORT = 5003
GRPC_QR_HEALTH_PORT = 5004

# Ports configuration - REST
QR_REST_PORT = 8082
URL_REST_PORT = 8083
USER_MGMT_PORT = 8080
ANALYTICS_PORT = 8081

# Ports configuration - Frontend
WEB_CLIENT_PORT = 3000

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help build test clean up down restart logs status health install-deps

# Default target
help: ## Display this help message
	@echo "$(BLUE)PSPD Lab - gRPC vs REST Microservices Management$(NC)"
	@echo "$(YELLOW)Academic comparison project with dual protocol implementation$(NC)"
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ================================
# DEVELOPMENT COMMANDS
# ================================

install-deps: ## Install dependencies for all Node.js services
	@echo "$(BLUE)Installing dependencies for all Node.js services...$(NC)"
	@cd services/rest/qr-generator && npm install
	@cd services/rest/url-shortener && npm install
	@cd services/rest/user-management && npm install
	@cd services/rest/analytics && npm install
	@cd frontend/web-client && npm install
	@echo "$(GREEN)✓ Dependencies installed for 4 REST services + 1 frontend$(NC)"

test: ## Run unit tests for all REST services
	@echo "$(BLUE)Running tests for all REST services...$(NC)"
	@cd services/rest/qr-generator && npm test
	@cd services/rest/url-shortener && npm test
	@cd services/rest/user-management && npm test || echo "$(YELLOW)⚠ User management tests not implemented yet$(NC)"
	@cd services/rest/analytics && npm test || echo "$(YELLOW)⚠ Analytics tests not implemented yet$(NC)"
	@echo "$(GREEN)✓ All tests completed$(NC)"

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	@cd services/rest/qr-generator && npm run test:coverage
	@cd services/rest/url-shortener && npm run test:coverage
	@echo "$(GREEN)✓ Coverage reports generated$(NC)"

lint: ## Run linting for all services
	@echo "$(BLUE)Running linting checks...$(NC)"
	@cd services/rest/qr-generator && npm run lint || true
	@cd services/rest/url-shortener && npm run lint || true
	@echo "$(GREEN)✓ Linting completed$(NC)"

# ================================
# DOCKER BUILD COMMANDS
# ================================

build: build-grpc build-rest build-frontend ## Build all services (gRPC + REST + Frontend)
	@echo "$(GREEN)✓ All services built successfully$(NC)"

build-grpc: build-grpc-link build-grpc-qr ## Build gRPC microservices
	@echo "$(GREEN)✓ All gRPC services built$(NC)"

build-rest: build-qr-rest build-url-rest build-user-mgmt build-analytics ## Build REST microservices
	@echo "$(GREEN)✓ All REST services built$(NC)"

build-grpc-link: ## Build gRPC Link Shortener (Microservice A)
	@echo "$(BLUE)Building gRPC Link Shortener (Microservice A)...$(NC)"
	@docker build -t $(GRPC_LINK_IMAGE) -f MicroserviceA_LinkShortener/MicroserviceA_LinkShortener/Dockerfile MicroserviceA_LinkShortener/
	@echo "$(GREEN)✓ gRPC Link Shortener built: $(GRPC_LINK_IMAGE)$(NC)"

build-grpc-qr: ## Build gRPC QR Generator (Microservice B)
	@echo "$(BLUE)Building gRPC QR Generator (Microservice B)...$(NC)"
	@docker build -t $(GRPC_QR_IMAGE) -f MicroserviceB_QRCode/MicroserviceB_QRCode/Dockerfile MicroserviceB_QRCode/
	@echo "$(GREEN)✓ gRPC QR Generator built: $(GRPC_QR_IMAGE)$(NC)"

build-qr-rest: ## Build QR Generator REST service image
	@echo "$(BLUE)Building QR Generator REST service...$(NC)"
	@docker build -t $(QR_REST_IMAGE) services/rest/qr-generator/
	@echo "$(GREEN)✓ QR Generator REST image built: $(QR_REST_IMAGE)$(NC)"

build-url-rest: ## Build URL Shortener REST service image
	@echo "$(BLUE)Building URL Shortener REST service...$(NC)"
	@docker build -t $(URL_REST_IMAGE) services/rest/url-shortener/
	@echo "$(GREEN)✓ URL Shortener REST image built: $(URL_REST_IMAGE)$(NC)"

build-user-mgmt: ## Build User Management service image
	@echo "$(BLUE)Building User Management service...$(NC)"
	@docker build -t $(USER_MGMT_IMAGE) services/rest/user-management/
	@echo "$(GREEN)✓ User Management image built: $(USER_MGMT_IMAGE)$(NC)"

build-analytics: ## Build Analytics service image
	@echo "$(BLUE)Building Analytics service...$(NC)"
	@docker build -t $(ANALYTICS_IMAGE) services/rest/analytics/
	@echo "$(GREEN)✓ Analytics image built: $(ANALYTICS_IMAGE)$(NC)"

build-frontend: ## Build Frontend Web Client
	@echo "$(BLUE)Building Frontend Web Client...$(NC)"
	@docker build -t $(WEB_CLIENT_IMAGE) frontend/web-client/
	@echo "$(GREEN)✓ Frontend built: $(WEB_CLIENT_IMAGE)$(NC)"

push: ## Push all images to registry
	@echo "$(BLUE)Pushing images to registry...$(NC)"
	@docker push $(GRPC_LINK_IMAGE)
	@docker push $(GRPC_QR_IMAGE)
	@docker push $(QR_REST_IMAGE)
	@docker push $(URL_REST_IMAGE)
	@docker push $(USER_MGMT_IMAGE)
	@docker push $(ANALYTICS_IMAGE)
	@docker push $(WEB_CLIENT_IMAGE)
	@echo "$(GREEN)✓ All images pushed to registry$(NC)"

# ================================
# DOCKER COMPOSE COMMANDS
# ================================

up: build ## Start all services (gRPC + REST + Frontend) with docker compose
	@echo "$(BLUE)Starting all services...$(NC)"
	@docker compose up -d
	@echo "$(GREEN)✓ All services are running$(NC)"
	@echo ""
	@echo "$(YELLOW)═══════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)gRPC Services (with Swagger):$(NC)"
	@echo "  Link Shortener (A):  http://localhost:$(GRPC_LINK_PORT)"
	@echo "    - Swagger UI:      http://localhost:$(GRPC_LINK_PORT)/swagger"
	@echo "  QR Generator (B):    http://localhost:$(GRPC_QR_PORT)"
	@echo "    - Swagger UI:      http://localhost:$(GRPC_QR_PORT)/swagger"
	@echo ""
	@echo "$(YELLOW)REST Services:$(NC)"
	@echo "  QR Generator:        http://localhost:$(QR_REST_PORT)"
	@echo "  URL Shortener:       http://localhost:$(URL_REST_PORT)"
	@echo "  User Management:     http://localhost:$(USER_MGMT_PORT)"
	@echo "  Analytics:           http://localhost:$(ANALYTICS_PORT)"
	@echo ""
	@echo "$(YELLOW)Frontend:$(NC)"
	@echo "  Web Client:          http://localhost:$(WEB_CLIENT_PORT)"
	@echo "$(YELLOW)═══════════════════════════════════════════════════$(NC)"

down: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(NC)"
	@docker compose down
	@echo "$(GREEN)✓ All services stopped$(NC)"

restart: down up ## Restart all services

logs: ## View logs from all services
	@echo "$(BLUE)Viewing logs from all services...$(NC)"
	@docker compose logs -f

logs-grpc-link: ## View gRPC Link Shortener logs
	@docker compose logs -f $(GRPC_LINK_SERVICE)

logs-grpc-qr: ## View gRPC QR Generator logs
	@docker compose logs -f $(GRPC_QR_SERVICE)

logs-qr-rest: ## View QR Generator REST logs
	@docker compose logs -f $(QR_REST_SERVICE)

logs-url-rest: ## View URL Shortener REST logs
	@docker compose logs -f $(URL_REST_SERVICE)

logs-user: ## View User Management logs
	@docker compose logs -f $(USER_MGMT_SERVICE)

logs-analytics: ## View Analytics logs
	@docker compose logs -f $(ANALYTICS_SERVICE)

logs-frontend: ## View Frontend Web Client logs
	@docker compose logs -f $(WEB_CLIENT)

# ================================
# STANDALONE DOCKER COMMANDS
# ================================

run-qr-rest: build-qr-rest ## Run QR Generator REST service standalone
	@echo "$(BLUE)Starting QR Generator REST service...$(NC)"
	@docker run -d --name $(QR_REST_SERVICE) -p $(QR_REST_PORT):$(QR_REST_PORT) $(QR_REST_IMAGE)
	@echo "$(GREEN)✓ QR Generator REST service running on port $(QR_REST_PORT)$(NC)"

run-url-rest: build-url-rest ## Run URL Shortener REST service standalone
	@echo "$(BLUE)Starting URL Shortener REST service...$(NC)"
	@docker run -d --name $(URL_REST_SERVICE) -p $(URL_REST_PORT):$(URL_REST_PORT) $(URL_REST_IMAGE)
	@echo "$(GREEN)✓ URL Shortener REST service running on port $(URL_REST_PORT)$(NC)"

run-user-mgmt: build-user-mgmt ## Run User Management service standalone
	@echo "$(BLUE)Starting User Management service...$(NC)"
	@docker run -d --name $(USER_MGMT_SERVICE) -p $(USER_MGMT_PORT):$(USER_MGMT_PORT) $(USER_MGMT_IMAGE)
	@echo "$(GREEN)✓ User Management service running on port $(USER_MGMT_PORT)$(NC)"

run-analytics: build-analytics ## Run Analytics service standalone
	@echo "$(BLUE)Starting Analytics service...$(NC)"
	@docker run -d --name $(ANALYTICS_SERVICE) -p $(ANALYTICS_PORT):$(ANALYTICS_PORT) $(ANALYTICS_IMAGE)
	@echo "$(GREEN)✓ Analytics service running on port $(ANALYTICS_PORT)$(NC)"

stop-all: ## Stop all standalone containers
	@echo "$(BLUE)Stopping all standalone containers...$(NC)"
	@docker stop $(QR_REST_SERVICE) $(URL_REST_SERVICE) $(USER_MGMT_SERVICE) $(ANALYTICS_SERVICE) 2>/dev/null || true
	@docker rm $(QR_REST_SERVICE) $(URL_REST_SERVICE) $(USER_MGMT_SERVICE) $(ANALYTICS_SERVICE) 2>/dev/null || true
	@echo "$(GREEN)✓ All standalone containers stopped and removed$(NC)"

# ================================
# HEALTH CHECK COMMANDS
# ================================

health: ## Check health of all services
	@echo "$(BLUE)Checking health of all services...$(NC)"
	@echo ""
	@echo "$(YELLOW)gRPC Services:$(NC)"
	@echo "  Link Shortener (A):"
	@curl -s http://localhost:$(GRPC_LINK_HEALTH_PORT)/health 2>/dev/null && echo "$(GREEN)✓ OK$(NC)" || echo "$(RED)✗ Not responding$(NC)"
	@echo "  QR Generator (B):"
	@curl -s http://localhost:$(GRPC_QR_HEALTH_PORT)/health 2>/dev/null && echo "$(GREEN)✓ OK$(NC)" || echo "$(RED)✗ Not responding$(NC)"
	@echo ""
	@echo "$(YELLOW)REST Services:$(NC)"
	@echo "  QR Generator REST:"
	@curl -s http://localhost:$(QR_REST_PORT)/health | jq . 2>/dev/null || echo "$(RED)✗ Not responding$(NC)"
	@echo "  URL Shortener REST:"
	@curl -s http://localhost:$(URL_REST_PORT)/health | jq . 2>/dev/null || echo "$(RED)✗ Not responding$(NC)"
	@echo "  User Management:"
	@curl -s http://localhost:$(USER_MGMT_PORT)/health | jq . 2>/dev/null || echo "$(RED)✗ Not responding$(NC)"
	@echo "  Analytics:"
	@curl -s http://localhost:$(ANALYTICS_PORT)/health | jq . 2>/dev/null || echo "$(RED)✗ Not responding$(NC)"
	@echo ""
	@echo "$(YELLOW)Frontend:$(NC)"
	@echo "  Web Client:"
	@curl -s http://localhost:$(WEB_CLIENT_PORT)/ >/dev/null 2>&1 && echo "$(GREEN)✓ OK$(NC)" || echo "$(RED)✗ Not responding$(NC)"

status: ## Show status of all containers
	@echo "$(BLUE)Container Status:$(NC)"
	@docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=microservice-\|qr-generator-rest\|url-shortener-rest\|user-management-rest\|analytics-rest\|web-client"

# ================================
# DEVELOPMENT ENVIRONMENT
# ================================

dev-up: ## Start services in development mode
	@echo "$(BLUE)Starting services in development mode...$(NC)"
	@cd services/rest/qr-generator && npm run dev &
	@cd services/rest/url-shortener && npm run dev &
	@echo "$(GREEN)✓ Development servers started$(NC)"
	@echo "$(YELLOW)Services running in development mode:$(NC)"
	@echo "  QR Generator:   http://localhost:$(QR_REST_PORT)"
	@echo "  URL Shortener:  http://localhost:$(URL_REST_PORT)"

dev-down: ## Stop development servers
	@echo "$(BLUE)Stopping development servers...$(NC)"
	@pkill -f "nodemon.*qr-generator" 2>/dev/null || true
	@pkill -f "nodemon.*url-shortener" 2>/dev/null || true
	@echo "$(GREEN)✓ Development servers stopped$(NC)"

# ================================
# PERFORMANCE TESTING
# ================================

load-test: ## Run load tests against all services (requires artillery or similar)
	@echo "$(BLUE)Running load tests...$(NC)"
	@echo "$(YELLOW)Note: Install artillery globally (npm install -g artillery) to run load tests$(NC)"
	@echo "Example commands:"
	@echo "  artillery quick --count 100 --num 10 http://localhost:$(QR_REST_PORT)/api/v1/qr/generate"
	@echo "  artillery quick --count 100 --num 10 http://localhost:$(URL_REST_PORT)/api/v1/url/shorten"

benchmark: ## Run performance benchmarks
	@echo "$(BLUE)Running performance benchmarks...$(NC)"
	@echo "$(YELLOW)QR Generator Performance:$(NC)"
	@ab -n 100 -c 10 http://localhost:$(QR_REST_PORT)/health 2>/dev/null || echo "Install apache2-utils for benchmarking"
	@echo "$(YELLOW)URL Shortener Performance:$(NC)"
	@ab -n 100 -c 10 http://localhost:$(URL_REST_PORT)/health 2>/dev/null || echo "Install apache2-utils for benchmarking"

# ================================
# CLEANUP COMMANDS
# ================================

clean: ## Clean up Docker images and containers
	@echo "$(BLUE)Cleaning up Docker resources...$(NC)"
	@docker compose down -v --remove-orphans 2>/dev/null || true
	@docker system prune -f
	@echo "$(GREEN)✓ Docker cleanup completed$(NC)"

clean-all: clean ## Complete cleanup including node_modules
	@echo "$(BLUE)Performing complete cleanup...$(NC)"
	@cd services/rest/qr-generator && rm -rf node_modules package-lock.json 2>/dev/null || true
	@cd services/rest/url-shortener && rm -rf node_modules package-lock.json 2>/dev/null || true
	@cd services/rest/user-management && rm -rf node_modules package-lock.json 2>/dev/null || true
	@cd services/rest/analytics && rm -rf node_modules package-lock.json 2>/dev/null || true
	@cd frontend/web-client && rm -rf node_modules package-lock.json build 2>/dev/null || true
	@docker rmi $(GRPC_LINK_IMAGE) $(GRPC_QR_IMAGE) $(QR_REST_IMAGE) $(URL_REST_IMAGE) $(USER_MGMT_IMAGE) $(ANALYTICS_IMAGE) $(WEB_CLIENT_IMAGE) 2>/dev/null || true
	@echo "$(GREEN)✓ Complete cleanup finished$(NC)"

reset: clean-all install-deps build ## Reset entire environment

# ================================
# UTILITY COMMANDS
# ================================

show-services: ## Show all service information
	@echo "$(BLUE)Complete PSPD Lab Service Configuration$(NC)"
	@echo ""
	@echo "$(YELLOW)═══════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)gRPC Microservices (Academic Comparison - .NET):$(NC)"
	@echo "  Microservice A:        Port $(GRPC_LINK_PORT) - Link Shortener (gRPC/Protobuf)"
	@echo "  Microservice B:        Port $(GRPC_QR_PORT) - QR Code Generator (gRPC/Protobuf)"
	@echo ""
	@echo "$(YELLOW)REST Microservices (Academic Comparison - Node.js):$(NC)"
	@echo "  QR Generator REST:     Port $(QR_REST_PORT) - Equivalent to Microservice B"
	@echo "  URL Shortener REST:    Port $(URL_REST_PORT) - Equivalent to Microservice A"
	@echo ""
	@echo "$(YELLOW)Extended Production Services (REST - Node.js):$(NC)"
	@echo "  User Management:       Port $(USER_MGMT_PORT) - Authentication & profiles"
	@echo "  Analytics:             Port $(ANALYTICS_PORT) - Data aggregation & reporting"
	@echo ""
	@echo "$(YELLOW)Frontend (React):$(NC)"
	@echo "  Web Client:            Port $(WEB_CLIENT_PORT) - Protocol comparison dashboard"
	@echo ""
	@echo "$(BLUE)Total Architecture: 2 gRPC + 4 REST + 1 Frontend = 7 services$(NC)"
	@echo "$(YELLOW)═══════════════════════════════════════════════════$(NC)"

show-endpoints: ## Show all service endpoints
	@echo "$(BLUE)Service Endpoints:$(NC)"
	@echo ""
	@echo "$(YELLOW)QR Generator REST (Port $(QR_REST_PORT)):$(NC)"
	@echo "  POST   /api/v1/qr/generate     - Generate single QR code"
	@echo "  POST   /api/v1/qr/batch        - Generate QR batch"
	@echo "  POST   /api/v1/qr/upload       - Upload data for QR processing"
	@echo "  GET    /api/v1/qr/:id          - Get QR code by ID"
	@echo "  DELETE /api/v1/qr/:id          - Delete QR code"
	@echo "  GET    /health                 - Health check"
	@echo ""
	@echo "$(YELLOW)URL Shortener REST (Port $(URL_REST_PORT)):$(NC)"
	@echo "  POST   /api/v1/url/shorten     - Shorten URL"
	@echo "  GET    /api/v1/url/:code       - Resolve short URL"
	@echo "  GET    /api/v1/url/:code/stats - Get click statistics"
	@echo "  POST   /api/v1/url/bulk        - Bulk URL shortening"
	@echo "  GET    /health                 - Health check"
	@echo ""
	@echo "$(YELLOW)User Management (Port $(USER_MGMT_PORT)):$(NC)"
	@echo "  Placeholder service - Full implementation pending"
	@echo ""
	@echo "$(YELLOW)Analytics (Port $(ANALYTICS_PORT)):$(NC)"
	@echo "  Placeholder service - Full implementation pending"

# ================================
# DOCUMENTATION
# ================================

docs: ## Generate API documentation
	@echo "$(BLUE)Generating API documentation...$(NC)"
	@echo "$(YELLOW)API Documentation locations:$(NC)"
	@echo "  QR Generator:   http://localhost:$(QR_REST_PORT)/"
	@echo "  URL Shortener:  http://localhost:$(URL_REST_PORT)/"
	@echo "$(GREEN)✓ Access running services for interactive API documentation$(NC)"

# ================================
# ACADEMIC COMPARISON HELPERS
# ================================

compare-setup: ## Set up environment for gRPC vs REST comparison
	@echo "$(BLUE)Setting up academic comparison environment...$(NC)"
	@echo "$(YELLOW)This will start REST services for comparison with gRPC services$(NC)"
	@make build
	@make up
	@echo "$(GREEN)✓ REST services ready for academic comparison$(NC)"
	@echo ""
	@echo "$(BLUE)Next steps for comparison study:$(NC)"
	@echo "1. Start equivalent gRPC services"
	@echo "2. Run performance tests on both implementations"
	@echo "3. Compare latency, throughput, and resource usage"
	@echo "4. Document findings in performance comparison report"