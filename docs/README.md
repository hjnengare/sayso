# KLIO Documentation

Welcome to the KLIO project documentation. This directory contains all documentation organized by topic and category.

## 📁 Documentation Structure

```
docs/
├── 01_setup/              # Project setup and getting started
├── 02_architecture/       # System architecture and database schemas
├── 03_features/           # Feature documentation and workflows
├── 04_optimization/       # Performance optimization and refactoring
├── 05_design/            # Design guidelines, animations, and wireframes
├── 06_ai-context/        # AI assistant context and guidelines
├── 07_deployment/        # Deployment and production readiness
├── 08_testing/           # Testing strategies and guides
├── api/                  # API endpoints and enhancements
├── database/             # Database schemas, migrations, and operations
├── frontend/             # Frontend components and architecture
├── backend/              # Backend services and cron jobs
└── troubleshooting/      # Diagnostic guides and issue resolution
```

## 📚 Quick Start

### New to the Project?
Start here:
1. [Project Overview](01_setup/PROJECT_OVERVIEW.md) - Understanding KLIO
2. [Setup Guide](01_setup/SETUP.md) - Environment setup and installation

### Understanding the System
3. [Authentication Analysis](02_architecture/AUTHENTICATION_ANALYSIS.md) - How auth works
4. [Database Architecture](02_architecture/DATABASE_ARCHITECTURE.md) - Complete database structure
5. [Business Table Schema](02_architecture/BUSINESSES_TABLE_SCHEMA.md) - Database schema for businesses

### Working with Features
6. [Business Ownership Workflow](03_features/BUSINESS_OWNERSHIP_WORKFLOW.md) - Business claiming process
7. [Feature Index](03_features/FEATURE_INDEX.md) - Complete feature list

### Performance & Optimization
8. [Performance Optimization Guide](04_optimization/PERFORMANCE_OPTIMIZATION_GUIDE.md) - Best practices
9. [Optimization Summary](04_optimization/OPTIMIZATION_SUMMARY.md) - What's been optimized

### Design & UI
10. [Animation Guide](05_design/ANIMATION_GUIDE.md) - Animation patterns
11. [Component Library](05_design/COMPONENT_LIBRARY.md) - UI component guidelines
12. [Wireframes](05_design/wireframes/) - UI mockups and designs

### Troubleshooting
13. [Troubleshooting Guide](troubleshooting/README.md) - Diagnostic guides and issue resolution

### For AI Assistants
14. [Claude Context](06_ai-context/CLAUDE.md) - AI assistant guidelines

## 🗂️ Category Folders

### api/
API endpoints, request/response formats, and API-related enhancements.
- [README](api/README.md) - API documentation index
- **API_USER_PROFILE_ENHANCEMENTS.md** - API enhancements for user profile endpoints

### database/
Database schemas, migrations, and database-related operations.
- [README](database/README.md) - Database documentation index
- **MIGRATION_ORDER_FOR_BUSINESS_IMAGES.md** - Migration order and dependencies
- **USER_STATS_SCHEMA.md** - User statistics table schema
- **VERIFICATION_STORAGE_URLS.md** - Storage URL verification documentation

### frontend/
React components, frontend architecture, and UI implementation details.
- [README](frontend/README.md) - Frontend documentation index
- **SIMILAR_BUSINESSES_COMPONENT_ARCHITECTURE.md** - Similar businesses component architecture

### backend/
Backend services, cron jobs, and server-side operations.
- [README](backend/README.md) - Backend documentation index
- **BACKEND_STATUS.md** - Current backend implementation status
- **LOCAL_CRON_SETUP.md** - Local cron job setup guide
- **TICKETMASTER_CRON_SETUP.md** - Ticketmaster cron job setup

### troubleshooting/
Diagnostic guides, debugging procedures, and solutions for common issues.
- [README](troubleshooting/README.md) - Troubleshooting documentation index
- **BUSINESS_IMAGES_EDGE_CASES.md** - Business images edge cases
- **BUSINESS_LOGIC_EDGE_CASES.md** - Business logic edge cases
- **DIAGNOSTIC_SIMILAR_BUSINESSES_AND_IMAGES.md** - Diagnostic guide for similar businesses
- **TROUBLESHOOTING_SIMILAR_BUSINESSES.md** - Troubleshooting guide for similar businesses
- And more... (see [README](troubleshooting/README.md) for complete list)

## 🗂️ Topic-Based Folders

### 01_setup/
Project setup, installation, and getting started guides.
- **PROJECT_OVERVIEW.md** - Project goals, tech stack, and architecture overview
- **SETUP.md** - Local development setup instructions
- **GETTING_STARTED.md** - Getting started guide
- **BUSINESS_IMAGES_STORAGE_SETUP.md** - Business images storage setup
- **SETUP_STORAGE_POLICIES.md** - Storage policies setup

### 02_architecture/
System architecture, database schemas, and architectural decisions.
- **AUTHENTICATION_ANALYSIS.md** - Authentication flow and security
- **AUTH_PRODUCTION_READINESS.md** - Auth security assessment and checklist
- **AUTH_RATE_LIMITING_IMPLEMENTATION.md** - Rate limiting implementation
- **DATABASE_ARCHITECTURE.md** - Complete database architecture
- **BUSINESSES_TABLE_SCHEMA.md** - Database schema for businesses
- **URL_STRUCTURE.md** - Application routing and URL structure
- **PROJECT_STRUCTURE.md** - Project file structure
- **SEO_STATUS.md** - SEO implementation status
- **BACKEND_IMPLEMENTATION_PLAN.md** - Backend feature roadmap
- **BACKEND_STATUS_SUMMARY.md** - Backend status summary
- **BACKEND_REVIEWER_FEATURES.md** - Reviewer feature specifications
- **BUSINESS_LOGIN_ANALYSIS.md** - Business login analysis

### 03_features/
Feature documentation, workflows, and implementation guides.
- **FEATURE_INDEX.md** - Complete feature list and index
- **BUSINESS_OWNERSHIP_WORKFLOW.md** - Business claim and verification process
- **BUSINESS_CLAIM_AND_IMAGE_UPLOAD_FLOW.md** - Business claim and image upload workflow
- **BUSINESS_FLOW_AND_IMAGES.md** - Business flow and images documentation
- **BUSINESS_IMAGES_TABLE.md** - Business images table documentation
- **BUSINESS_IMAGES_SYNC_IMPLEMENTATION.md** - Business images sync implementation
- **FILTERING_IMPLEMENTATION.md** - User interest-based filtering system
- **RECOMMENDATION_SYSTEM.md** - Recommendation engine documentation
- **REVIEW_FORM_IMPLEMENTATION.md** - Review form implementation details
- **REVIEW_SUBMISSION_FIX.md** - Review submission fixes and improvements
- **SEO_METADATA_IMPLEMENTATION.md** - SEO metadata implementation
- **TOAST_NOTIFICATIONS_IMPLEMENTATION.md** - Toast notification system
- **ONBOARDING_PERFORMANCE.md** - Onboarding performance documentation

### 04_optimization/
Performance optimization, refactoring, and optimization guides.
- **PERFORMANCE_OPTIMIZATION_GUIDE.md** - Step-by-step optimization guide
- **OPTIMIZATION_SUMMARY.md** - Quick reference for optimizations
- **OPTIMIZATION_CHECKLIST.md** - Performance best practices checklist
- **CACHING_AND_CDN.md** - Caching strategies and CDN configuration
- **DATABASE_PERFORMANCE_OPTIMIZATION.md** - Database optimization guide
- **COMPONENTIZATION_PLAN.md** - Component refactoring and decomposition plan
- **REFACTORING_SUMMARY.md** - Code refactoring notes
- **CONSOLE_WARNINGS_FIXES.md** - Console warning fixes and cleanup
- **LOADER_UNIFICATION_COMPLETE.md** - Loader component unification
- **QUICK_OPTIMIZATION_REFERENCE.md** - Quick reference and commands
- **PERFORMANCE_OPTIMIZATION_PLAN.md** - Optimization roadmap and priorities
- **PERFORMANCE_OPTIMIZATION_SUMMARY.md** - Summary of optimizations
- **PERFORMANCE_OPTIMIZATION.md** - Performance optimization guide (bundle)

### 05_design/
Design guidelines, animations, component library, and wireframes.
- **ANIMATION_GUIDE.md** - Animation patterns and guidelines
- **COMPONENT_LIBRARY.md** - UI component guidelines and library
- **wireframes/** - UI design mockups (13 screens)

### 06_ai-context/
Guidelines and context for AI assistants working on the project.
- **CLAUDE.md** - Guidelines for AI assistants

### 07_deployment/
Deployment guides, production fixes, and deployment checklists.
- **DEPLOYMENT_TODO.md** - Deployment checklist and tasks
- **PRODUCTION_FIXES.md** - Production fixes and improvements log

### 08_testing/
Testing strategies, test maintenance, and testing guides.
- **TEST_STRATEGY.md** - Testing strategy documentation
- **TEST_SUITE_SUMMARY.md** - Test suite summary
- **MAINTAINING_TESTS.md** - Test maintenance guide
- **QUICK_REFERENCE.md** - Quick testing reference
- **TESTING_BUSINESS_CLAIM_AND_IMAGE_UPLOAD.md** - Testing guide for business claim and image upload
- **README.md** - Testing documentation index

## 🚀 Contributing

When adding new documentation:

1. **Place it in the correct category folder:**
   - API documentation → `api/`
   - Database documentation → `database/`
   - Frontend documentation → `frontend/`
   - Backend documentation → `backend/`
   - Troubleshooting guides → `troubleshooting/`
   - Setup guides → `01_setup/`
   - Architecture docs → `02_architecture/`
   - Feature docs → `03_features/`
   - Optimization docs → `04_optimization/`
   - Design docs → `05_design/`
   - Testing docs → `08_testing/`
   - Deployment docs → `07_deployment/`

2. **Use clear, descriptive filenames:**
   - Use `kebab-case` for new files (e.g., `api-endpoints.md`)
   - Existing files may use `UPPER_CASE` or `PascalCase` - consistency preferred but not required

3. **Update relevant README files:**
   - Add a reference to the category folder README (if exists)
   - Update this main README if it's a significant addition

4. **Follow documentation standards:**
   - Use Markdown format (`.md`)
   - Include code examples where relevant
   - Add diagrams for complex workflows
   - Keep language clear and concise
   - Update documentation when making related code changes

5. **Never place files in the root `/docs` directory:**
   - All `.md` files must be in a category folder
   - The only exception is this `README.md` file

## 📝 Documentation Standards

- Use Markdown format (`.md`)
- Include code examples where relevant
- Add diagrams for complex workflows
- Keep language clear and concise
- Update documentation when making related code changes
- Use descriptive filenames
- Place files in appropriate category folders

## 🔗 Related Resources

- [Database Migrations](../src/app/lib/migrations/README.md) - SQL migration documentation
- [Design System](../src/app/design-system/README.md) - Component library documentation

## 📧 Questions?

For questions about the documentation or suggestions for improvements, please reach out to the development team.
