# KLIO Project Structure

Complete overview of the KLIO project organization.

## 📂 Root Directory

```
KLIO/
├── docs/                          # 📚 Documentation (organized by category)
├── src/                           # 💻 Source code
├── public/                        # 🎨 Static assets
├── tests/                         # 🧪 Test files
├── scripts/                       # 🛠️ Build and utility scripts
├── node_modules/                  # 📦 Dependencies
├── .next/                         # ⚙️ Next.js build output (gitignored)
│
├── .gitignore                     # Git ignore rules
├── package.json                   # Project dependencies
├── tsconfig.json                  # TypeScript configuration
├── next.config.ts                 # Next.js configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.js              # PostCSS configuration
├── env.example                    # Environment variables template
└── README.md                      # Project readme
```

## 📚 Documentation Structure (`docs/`)

Organized by topic for easy navigation:

```
docs/
├── 01_setup/                      # 🚀 Getting started
│   ├── GETTING_STARTED.md         # Quick start guide
│   ├── PROJECT_OVERVIEW.md        # Project goals and tech stack
│   └── SETUP.md                   # Detailed setup instructions
│
├── 02_architecture/               # 🏗️ System architecture
│   ├── AUTHENTICATION_ANALYSIS.md # Auth flow documentation
│   ├── AUTH_PRODUCTION_READINESS.md # Auth security assessment
│   ├── AUTH_RATE_LIMITING_IMPLEMENTATION.md # Rate limiting docs
│   ├── BACKEND_IMPLEMENTATION_PLAN.md # Backend feature roadmap
│   ├── BACKEND_REVIEWER_FEATURES.md # Reviewer feature specs
│   ├── BUSINESSES_TABLE_SCHEMA.md # Business data structure
│   ├── DATABASE_ARCHITECTURE.md   # Complete database schema
│   └── URL_STRUCTURE.md           # Application routing structure
│
├── 03_features/                   # ✨ Feature documentation
│   ├── BUSINESS_OWNERSHIP_WORKFLOW.md # Business claiming process
│   ├── FEATURE_INDEX.md           # Complete feature list
│   ├── FILTERING_IMPLEMENTATION.md # User interest filtering
│   ├── RECOMMENDATION_SYSTEM.md   # Recommendation engine
│   ├── REVIEW_FORM_IMPLEMENTATION.md # Review form docs
│   ├── REVIEW_SUBMISSION_FIX.md   # Review submission fixes
│   ├── SEO_METADATA_IMPLEMENTATION.md # SEO implementation
│   └── TOAST_NOTIFICATIONS_IMPLEMENTATION.md # Toast system
│
├── 04_optimization/               # ⚡ Performance docs
│   ├── CACHING_AND_CDN.md         # Caching and CDN strategy
│   ├── COMPONENTIZATION_PLAN.md   # Component refactoring plan
│   ├── CONSOLE_WARNINGS_FIXES.md  # Console warning fixes
│   ├── DATABASE_PERFORMANCE_OPTIMIZATION.md # DB optimization
│   ├── LOADER_UNIFICATION_COMPLETE.md # Loader unification
│   ├── OPTIMIZATION_CHECKLIST.md  # Performance checklist
│   ├── OPTIMIZATION_SUMMARY.md    # Summary of optimizations
│   ├── PERFORMANCE_OPTIMIZATION.md # Performance guide (bundle)
│   ├── PERFORMANCE_OPTIMIZATION_GUIDE.md # Step-by-step guide
│   ├── PERFORMANCE_OPTIMIZATION_PLAN.md # Optimization roadmap
│   ├── PERFORMANCE_OPTIMIZATION_SUMMARY.md # Optimization summary
│   ├── QUICK_OPTIMIZATION_REFERENCE.md # Quick reference
│   └── REFACTORING_SUMMARY.md     # Refactoring notes
│
├── 05_design/                     # 🎨 Design system
│   ├── ANIMATION_GUIDE.md         # Animation patterns
│   ├── COMPONENT_LIBRARY.md       # UI component guidelines
│   └── wireframes/                # UI mockups (13 screens)
│
├── 06_ai-context/                 # 🤖 AI assistant context
│   └── CLAUDE.md                  # AI guidelines
│
├── 07_deployment/                 # 🚀 Deployment & production
│   ├── DEPLOYMENT_TODO.md         # Deployment checklist
│   └── PRODUCTION_FIXES.md        # Production fixes log
│
├── README.md                      # Documentation index
└── PROJECT_STRUCTURE.md           # This file
```

## 💻 Source Code Structure (`src/`)

```
src/
├── app/                           # Next.js App Router
│   ├── (pages)/                   # Page components
│   │   ├── page.tsx              # Home page
│   │   ├── login/                # Login page
│   │   ├── signup/               # Signup page
│   │   ├── onboarding/           # Onboarding flow
│   │   ├── business/             # Business pages
│   │   │   ├── [id]/            # Business detail
│   │   │   │   ├── page.tsx     # View business
│   │   │   │   ├── edit/        # Edit business
│   │   │   │   └── review/      # Add review
│   │   │   ├── login/           # Business owner login
│   │   │   ├── review/          # Review management
│   │   │   └── verification-status/
│   │   ├── manage-business/      # Business dashboard
│   │   ├── claim-business/       # Claim workflow
│   │   ├── admin/                # Admin pages
│   │   │   └── seed/            # Database seeding
│   │   ├── profile/              # User profile
│   │   └── events-specials/      # Events page
│   │
│   ├── api/                       # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── businesses/           # Business CRUD
│   │   │   ├── route.ts         # List/create businesses
│   │   │   ├── [id]/            # Single business operations
│   │   │   ├── seed/            # Database seeding
│   │   │   ├── preview/         # Preview seed data
│   │   │   └── update-images/   # Image uploads
│   │   ├── reviews/              # Review operations
│   │   ├── profile/              # Profile management
│   │   ├── onboarding/           # Onboarding data
│   │   ├── claim-business/       # Business claims
│   │   └── seed/                 # Seed utilities
│   │
│   ├── components/                # Page-specific components
│   │   ├── Header/               # App header
│   │   ├── BusinessCard.tsx      # Business display card
│   │   └── ...                   # Other shared components
│   │
│   ├── contexts/                  # React Contexts
│   │   └── AuthContext.tsx       # Authentication state
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useBusinessAccess.ts  # Business ownership checks
│   │   └── shared/               # Shared hooks
│   │
│   ├── lib/                       # Utilities and services
│   │   ├── migrations/           # Database migrations (SQL)
│   │   │   ├── 001_core/        # Core database setup
│   │   │   ├── 002_business/    # Business tables
│   │   │   ├── 003_reviews/     # Review system
│   │   │   ├── 004_storage/     # Storage setup
│   │   │   ├── 005_functions/   # Database functions
│   │   │   └── README.md        # Migration guide
│   │   │
│   │   ├── services/             # Business logic services
│   │   │   ├── businessOwnershipService.ts
│   │   │   ├── overpassService.ts # OSM data fetching
│   │   │   └── ...
│   │   │
│   │   ├── utils/                # Utility functions
│   │   │   ├── osmToBusinessMapper.ts
│   │   │   └── ...
│   │   │
│   │   ├── types/                # TypeScript types
│   │   │   └── database.ts      # Database types
│   │   │
│   │   ├── auth.ts               # Auth utilities
│   │   └── supabase.ts           # Supabase client
│   │
│   ├── design-system/             # Design system components
│   │   └── README.md             # Design system docs
│   │
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
│
├── components/                    # Atomic design components
│   ├── atoms/                     # Basic building blocks
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Badge/
│   │   └── ...
│   │
│   ├── molecules/                 # Simple combinations
│   │   ├── FormField/
│   │   ├── SearchBar/
│   │   ├── Card/
│   │   └── ...
│   │
│   ├── organisms/                 # Complex UI sections
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── BusinessCard/
│   │   └── ...
│   │
│   └── templates/                 # Page layouts
│       ├── MainLayout/
│       ├── AuthLayout/
│       └── ...
│
├── hooks/                         # Global custom hooks
│   └── shared/
│
├── styles/                        # Shared styles
│   └── shared/
│
├── types/                         # Global TypeScript types
│
├── pages/                         # Legacy pages (if any)
│
└── middleware.ts                  # Next.js middleware
```

## 🎨 Public Assets (`public/`)

```
public/
├── hero/                          # Hero/banner images
│   ├── table_mountain.jpeg
│   ├── cpt_table_mountain.jpg
│   └── ... (15+ images)
│
├── png/                           # Category icons
│   ├── 001-restaurant.png
│   ├── 002-coffee-cup.png
│   └── ... (56 icons total)
│
└── (other static assets)
```

## 🧪 Tests (`tests/`)

```
tests/
├── onboarding-flow.spec.ts       # Onboarding E2E tests
└── user-registration.spec.ts     # Registration E2E tests
```

## 🛠️ Scripts (`scripts/`)

```
scripts/
├── check-env.js                  # Environment validation
├── dev-performance.js            # Development performance monitoring
└── performance-audit.js          # Production performance audit
```

## 🗄️ Database Structure

See [Database Architecture](docs/02_architecture/DATABASE_ARCHITECTURE.md) for complete schema.

**Key Tables:**
- `profiles` - User profiles
- `businesses` - Business listings
- `business_stats` - Aggregated statistics
- `reviews` - Customer reviews
- `review_images` - Review photos
- `user_interests` - User preferences
- `business_ownership_claims` - Ownership requests

## 🔑 Configuration Files

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_OVERPASS_API_URL=
```

### TypeScript (`tsconfig.json`)
- Strict mode enabled
- Path aliases configured
- Module resolution optimized

### Next.js (`next.config.ts`)
- Image optimization
- Environment variables
- Build optimizations

### Tailwind (`tailwind.config.js`)
- Custom color palette
- Design tokens
- Plugin configuration

## 📦 Key Dependencies

**Framework & Core:**
- Next.js 15.0 (App Router)
- React 19.0
- TypeScript 5.x

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- @supabase/ssr

**UI & Styling:**
- Tailwind CSS
- Lucide Icons
- Framer Motion (animations)

**Development:**
- ESLint
- Playwright (E2E testing)
- PostCSS

## 🚀 Quick Navigation

### For Developers
1. Start with [Getting Started](docs/01_setup/GETTING_STARTED.md)
2. Review [Database Architecture](docs/02_architecture/DATABASE_ARCHITECTURE.md)
3. Check [Component Library](docs/05_design/COMPONENT_LIBRARY.md)
4. Follow [Optimization Checklist](docs/04_optimization/OPTIMIZATION_CHECKLIST.md)

### For Designers
1. Review [Design System](docs/05_design/COMPONENT_LIBRARY.md)
2. Check [Wireframes](docs/05_design/wireframes/)
3. Read [Animation Guide](docs/05_design/ANIMATION_GUIDE.md)

### For Product Managers
1. See [Feature Index](docs/03_features/FEATURE_INDEX.md)
2. Review [Business Ownership Workflow](docs/03_features/BUSINESS_OWNERSHIP_WORKFLOW.md)

### For DevOps
1. Check [Setup Guide](docs/01_setup/SETUP.md)
2. Review [Database Migrations](src/app/lib/migrations/README.md)
3. See [Performance Optimization](docs/04_optimization/)

## 📝 File Naming Conventions

### Components
- PascalCase for files: `BusinessCard.tsx`
- PascalCase for exports: `export const BusinessCard`
- Index files for barrel exports: `index.ts`

### Pages (Next.js App Router)
- lowercase with hyphens: `claim-business/page.tsx`
- Dynamic routes: `[id]/page.tsx`
- Route groups: `(auth)/login/page.tsx`

### API Routes
- lowercase with hyphens: `api/businesses/route.ts`
- HTTP method exports: `export async function GET()`

### Utilities
- camelCase: `osmToBusinessMapper.ts`
- Descriptive names: `businessOwnershipService.ts`

### Types
- PascalCase for interfaces: `interface Business {}`
- camelCase for files: `database.ts`

## 🔒 Security Notes

### Protected Routes
- User authentication: `/profile`, `/manage-business`
- Business owner only: `/business/[id]/edit`, `/manage-business`
- Admin only: `/admin/*`

### Row Level Security (RLS)
- Enabled on all database tables
- User data isolated by `user_id`
- Business data protected by ownership
- Reviews moderated by status

## 📊 Performance Considerations

### Code Splitting
- Automatic page-based splitting
- Dynamic imports for heavy components
- Lazy loading for below-fold content

### Image Optimization
- Next.js Image component used throughout
- WebP format with fallbacks
- Lazy loading enabled
- Responsive images with srcset

### Database
- Indexed queries for common patterns
- Denormalized statistics for performance
- Pagination on all list endpoints
- Full-text search with PostgreSQL

## 🔄 Git Workflow

### Branch Strategy
- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

### Ignored Files (`.gitignore`)
- `node_modules/`
- `.env.local`
- `.next/`
- Build outputs
- Test reports
- IDE configurations
- Temporary files

## 📱 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment
- Deployed on Vercel
- Database on Supabase
- CDN for static assets

## 🎯 Next Steps

1. Set up your local environment
2. Run database migrations
3. Explore the codebase
4. Review documentation
5. Start building!

For detailed setup instructions, see [Getting Started](docs/01_setup/GETTING_STARTED.md).

