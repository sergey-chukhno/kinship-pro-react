# Project Analysis: Kinship Pro React

## 1. Executive Summary
The project is a React application built with TypeScript, using `create-react-app`. It serves as a dashboard for the **Association "ToutKouleur"**.

**Key Characteristics:**
- **Multi-Tenancy:** The application supports four distinct user types, each with their own registration flow and dashboard interface:
    1.  **Personal Users**
    2.  **Teachers**
    3.  **Schools**
    4.  **Companies**
- **Context Switching:** Users may hold multiple roles (e.g., a "Personal User" who is also a "Company" admin). The app requires a **Context Switcher** to allow seamless navigation between these dashboards without re-login.

**Current State:**
- **Hybrid Data Flow:** Authentication (Login/Register) is fully integrated with a Rails backend via REST API. However, **core features (Dashboard, Projects, Members, Badges) rely almost entirely on mock data** embedded in the frontend.
- **Architecture:** The app uses a central `AppContext` for state management, which is currently initialized with static mock data.
- **UI/UX:** The UI is well-structured with a sidebar layout, responsive design, and distinct themes for different user types (Pro, Edu, Teacher, User).

## 2. Project Structure

### Key Directories
- **`src/api`**: Contains the API client configuration (`config.ts`) and feature-specific API modules (`Authentication.ts`, `Project.ts`, etc.).
- **`src/components`**:
    - **`Layout`**: Main application shell (`MainLayout`, `Sidebar`, `UserHeader`).
    - **`Pages`**: Page-level components (`Dashboard`, `Projects`, `Members`, etc.).
    - **`Modals`, `UI`**: Reusable UI elements.
- **`src/context`**: Contains `AppContext.tsx`, the global state manager.
- **`src/data`**: Contains `mockData.ts`, which currently powers most of the application.
- **`src/types`**: TypeScript definitions for domain entities (User, Member, Project, etc.).

## 3. Data Flow Overview

### Authentication (Real API)
1.  **User Action**: Submits Login/Register form.
2.  **Component**: Calls function from `src/api/Authentication.ts`.
3.  **API Client**: `axiosClient` sends POST request to `/api/v1/auth/...`.
4.  **Interceptors**: `axiosClient` attaches JWT token from `localStorage` to subsequent requests.

### Core Features (Mock Data)
1.  **User Action**: Navigates to Dashboard or Projects.
2.  **Component**: `useAppContext()` retrieves `state`.
3.  **State**: `state` is initialized with `mockDashboardStats`, `mockProjects`, etc., from `src/data/mockData.ts`.
4.  **Rendering**: Component renders static data. **No API call is made.**

## 4. REST API Integration

### Configuration
-   **Client**: `axios` instance created in `src/api/config.ts`.
-   **Base URL**: `process.env.REACT_APP_DB_BASE_URL`.
-   **Auth**: Request interceptor adds `Authorization: Bearer <token>`.

### Existing Endpoints (Verified)
-   `POST /api/v1/auth/login`
-   `POST /api/v1/auth/register` (supports multiple types: personal, teacher, school, company)
-   `GET /api/v1/auth/me`
-   `POST /api/v1/auth/refresh`
-   `POST /api/v1/auth/logout`

### Missing/Planned Integrations
The following features have API modules started (e.g., `Project.ts`, `User.ts`) but are not fully utilized in the components:
-   Projects (CRUD)
-   Members (CRUD)
-   Events
-   Badges

## 5. Component-Level Responsibilities

-   **`MainLayout`**: Handles routing (`react-router-dom`) and theme switching based on `showingPageType`.
-   **`UserHeader` / `Sidebar`**: Needs to implement the **Context Switcher** logic to toggle `showingPageType` based on the authenticated user's available profiles.
-   **`AppContext`**: Acts as a "God Object" store. It holds all data (members, projects, etc.) and provides dispatch methods to modify it.
    -   *Risk*: As the app grows, this will become unmanageable.
-   **`Dashboard`**: Purely presentational, consuming mock stats.
-   **`AuthPage`**: Handles complex registration logic with multiple steps and user types.

## 6. Potential Issues & Risks

1.  **Mock Data Dependency**: The biggest risk is the discrepancy between mock data structures and actual API responses. Migrating will require careful type alignment.
2.  **State Management Scalability**: `AppContext` loading *everything* into memory is not scalable.
    -   *Recommendation*: Move to server-state management (e.g., React Query) for fetching lists of projects/members.
3.  **Error Handling**: Global error handling for API failures (e.g., 401 Unauthorized, 500 Server Error) needs to be robust.
4.  **Type Safety**: TypeScript interfaces in `src/types` must strictly match the Rails API JSON serialization.

## 7. Opportunities for Clean Integration

### Proposed Workflow for New Features
1.  **Define Types**: Update `src/types` to match the expected JSON from Rails.
2.  **Create API Service**: Add functions to `src/api/[Feature].ts` (e.g., `getProjects()`, `createProject()`).
3.  **Implement Data Fetching**:
    -   *Short-term*: Use `useEffect` in components to call API and set local state or Context state.
    -   *Long-term (Recommended)*: Introduce **TanStack Query (React Query)** to handle caching, loading states, and re-fetching automatically.
4.  **Remove Mocks**: Gradually replace `mockData` imports with real API data.

### Immediate Next Steps
-   Verify the `Project` and `Member` JSON structure from the backend.
-   Refactor `Dashboard` to fetch real stats asynchronously.
