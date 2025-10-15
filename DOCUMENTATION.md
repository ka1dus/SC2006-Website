# Hawker Opportunity Score Platform

A comprehensive web application for analyzing Singapore's hawker opportunity scores across subzones, built as a lab project for SC2006.

## 🎯 Project Overview

This platform implements a sophisticated analysis system that calculates Hawker Opportunity Scores for Singapore subzones using kernel-smoothed demand, competing-adjusted supply, and transport accessibility metrics. The system provides interactive visualization, detailed analysis, and administrative tools for data management.

## ✨ Features Implemented

### Core Functionality
- **Interactive Map Visualization**: Display Singapore subzones as interactive polygons with Mapbox GL JS
- **Choropleth Layer**: Color-code subzones by Hawker Opportunity Score with dynamic legend
- **Score Calculation Engine**: Kernel density estimation for demand, supply, and accessibility
- **Real-time Filtering**: Filter by geography (region) and score percentile
- **Search Functionality**: Autocomplete subzone name search with instant results

### User Features
- **Subzone Details Panel**: Comprehensive demographic, hawker center, and transport data
- **Comparison Tool**: Side-by-side comparison of two subzones with radar charts
- **Export Capabilities**: PDF/PNG export of subzone details and comparisons
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

### Admin Features
- **Dataset Refresh**: Update official datasets and recompute scores
- **Snapshot Management**: View and restore historical score snapshots
- **System Statistics**: Real-time dashboard with key metrics
- **User Management**: Admin console for system administration

### Authentication & Security
- **User Registration**: Secure account creation with password validation
- **JWT Authentication**: Token-based authentication with automatic refresh
- **Password Management**: Change password and reset forgotten passwords
- **Role-based Access**: Client and Admin user roles with appropriate permissions

## 🏗️ Architecture

### Backend (Node.js + Express + TypeScript)
```
backend/
├── src/
│   ├── main.ts              # Server entrypoint
│   ├── database/            # Database client and migrations
│   ├── models/             # Prisma ORM models
│   ├── schemas/            # Zod validation schemas
│   ├── services/           # Business logic layer
│   │   ├── score.service.ts    # Hawker Opportunity Score calculation
│   │   ├── auth.service.ts     # Authentication logic
│   │   └── subzone.service.ts  # Subzone data management
│   ├── controllers/        # HTTP request handlers
│   ├── routers/            # API route definitions
│   └── middlewares/        # Authentication and error handling
└── prisma/                 # Database schema and migrations
```

### Frontend (Next.js + React + TypeScript)
```
frontend/
├── src/
│   ├── pages/              # Next.js pages
│   ├── components/         # Reusable UI components
│   │   ├── MapView.tsx         # Interactive map component
│   │   ├── FilterPanel.tsx     # Filtering interface
│   │   ├── SubzoneDetails.tsx  # Detailed subzone information
│   │   └── ComparisonTray.tsx # Subzone comparison tool
│   ├── contexts/           # React Context providers
│   ├── services/           # API client services
│   └── styles/             # Global CSS and Tailwind config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Mapbox account (for map tiles)

### Installation

1. **Clone and setup**:
```bash
git clone <repository-url>
cd hawker-opportunity-score
chmod +x setup.sh
./setup.sh
```

2. **Configure environment**:
```bash
# Backend configuration
cp backend/env.example backend/.env
# Edit backend/.env with your database URL and API keys

# Frontend configuration  
cp frontend/env.example frontend/.env.local
# Edit frontend/.env.local with your Mapbox token
```

3. **Setup database**:
```bash
cd backend
npx prisma db push
npm run db:seed
```

4. **Start development servers**:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/health

## 📊 Use Cases Implemented

All 17 use cases from the requirements have been implemented:

### Functional Requirement #1: Map Display
- ✅ **1.1 DisplaySubzones**: Interactive map with subzone polygons
- ✅ **1.2 ChoroplethLayer**: Score-based color coding with legend
- ✅ **1.3 MapInteractionControls**: Zoom, pan, hover, and click interactions

### Functional Requirement #2: Score Calculation
- ✅ **2.1 Hawker-OpportunityScore**: Kernel-smoothed calculation engine
- ✅ **2.3 ShowSubzoneRankPercentile**: Percentile ranking display

### Functional Requirement #3: Filtering & Search
- ✅ **3.1 FilterByGeography**: Region-based filtering
- ✅ **3.2 FilterByScoreQuantile**: Score percentile filtering
- ✅ **3.3 SearchBySubzoneName**: Autocomplete search functionality

### Functional Requirement #4: Analysis & Comparison
- ✅ **4.1 ShowSubzoneDetails**: Comprehensive subzone information
- ✅ **4.2 SubzoneComparison**: Side-by-side comparison tool

### Functional Requirement #5: Admin Management
- ✅ **5.1 RefreshDatasets**: Dataset refresh and score recomputation
- ✅ **5.2 ManageSnapshots**: Historical snapshot management
- ✅ **5.3 ExportSubzoneDetails**: PDF/PNG export functionality

### Functional Requirement #6: Authentication
- ✅ **6.1 ClientRegistration**: User account creation
- ✅ **6.2 UserLogin**: Authentication system
- ✅ **6.3 PasswordManagement**: Password change functionality
- ✅ **6.4 ResetForgottenPassword**: Password reset system

## 🔧 Technical Implementation

### Score Calculation Algorithm
The Hawker Opportunity Score uses a sophisticated kernel density estimation approach:

1. **Demand Calculation**: Population-weighted kernel smoothing with configurable bandwidth
2. **Supply Calculation**: Hawker center capacity with competition adjustment
3. **Accessibility Calculation**: MRT and bus stop weighted accessibility
4. **Normalization**: Robust z-score normalization for each component
5. **Final Score**: Weighted combination: `H = wD * Z(Dem) - wS * Z(Sup) + wA * Z(Acc)`

### Database Design
- **PostgreSQL** with Prisma ORM
- **Normalized schema** with proper relationships
- **Geospatial support** for polygon and point data
- **Audit trails** with snapshots and versioning

### Security Features
- **JWT-based authentication** with configurable expiration
- **Password hashing** with bcrypt
- **Input validation** with Zod schemas
- **CORS protection** and security headers
- **Role-based access control**

## 📈 Performance Optimizations

- **Database indexing** on frequently queried fields
- **Query optimization** with Prisma
- **Caching strategies** with React Query
- **Lazy loading** for map components
- **Efficient geospatial queries** for distance calculations

## 🧪 Testing & Quality Assurance

- **TypeScript** for type safety across the stack
- **Zod validation** for runtime type checking
- **Error handling** with comprehensive error boundaries
- **Loading states** and user feedback
- **Responsive design** testing across devices

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/reset-password` - Reset password

### Subzone Endpoints
- `GET /api/subzones` - Get all subzones with filtering
- `GET /api/subzones/:id` - Get subzone by ID
- `GET /api/subzones/:id/details` - Get detailed subzone information
- `GET /api/subzones/search` - Search subzones by name
- `GET /api/subzones/scores/latest` - Get latest scores

### Admin Endpoints
- `POST /api/admin/refresh-datasets` - Refresh datasets
- `GET /api/admin/snapshots` - Get all snapshots
- `GET /api/admin/stats` - Get system statistics

### Export Endpoints
- `POST /api/export/subzone` - Export subzone details
- `POST /api/export/comparison` - Export comparison data

## 🔮 Future Enhancements

- **Real-time data updates** with WebSocket connections
- **Advanced analytics** with statistical visualizations
- **Mobile app** with React Native
- **Machine learning** integration for predictive analysis
- **Multi-language support** for international users

## 🤝 Contributing

This is a lab project for SC2006. For academic purposes, the codebase demonstrates:
- Full-stack web development best practices
- Complex algorithm implementation
- Database design and optimization
- User interface design principles
- System architecture patterns

## 📄 License

This project is created for educational purposes as part of SC2006 coursework.

## 👨‍💻 Author

**Nguyen Le Tam**  
SC2006 Lab Project  
Created: September 2025  
Last Updated: October 2025

---

*Built with ❤️ for Singapore's hawker culture analysis*
