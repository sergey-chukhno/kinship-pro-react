# Personal Dashboard Context Switching Implementation

## Overview

Added support for personal dashboard in the "Mes organisations" section, allowing users to switch to their personal dashboard context when `user_dashboard` is available in `available_contexts`.

## Changes Implemented

### 1. Sidebar Component (`src/components/Layout/Sidebar.tsx`)

#### Organization Type Update
- Extended organization type definition to include `'user'`:
  ```typescript
  type: 'school' | 'company' | 'teacher' | 'user'
  ```

#### Personal Dashboard in Organization List
- Added logic to include personal dashboard at the **top** of the organizations list:
  ```typescript
  // Add personal dashboard if available (at the top)
  if (contexts.user_dashboard) {
    orgs.push({
      id: 'user-dashboard',
      name: 'Tableau de bord personnel',
      type: 'user',
      isAdmin: false
    });
  }
  ```

#### Navigation Logic Update
- Updated `handleOrganizationSwitch` to handle `'user'` type:
  - Personal dashboard navigates to `/projects`
  - Other organization types navigate to `/dashboard`
  ```typescript
  case 'user':
    newPageType = 'user';
    break;
  
  // Navigate to appropriate page
  if (orgType === 'user') {
    onPageChange('projects');
    navigate('/projects');
  } else {
    onPageChange('dashboard');
    navigate('/dashboard');
  }
  ```

### 2. UserHeader Component (`src/components/Layout/UserHeader.tsx`)

Applied identical changes to maintain consistency between Sidebar and UserHeader dropdowns:
- Updated organization type to include `'user'`
- Added personal dashboard to organizations list (at top)
- Updated navigation logic to route to `/projects` for personal dashboard

## Behavior

- **Display Name**: "Tableau de bord personnel"
- **Position**: Top of the organizations list
- **Navigation**: Clicking navigates to `/projects` page
- **Context Switch**: Sets `showingPageType` to `'user'`
- **Visibility**: Only appears when `available_contexts.user_dashboard` is `true`

## Verification

- ✅ Build completed successfully
- ✅ Personal dashboard appears at top of list when `user_dashboard` is true
- ✅ Clicking personal dashboard switches context to `'user'`
- ✅ Navigation to `/projects` works correctly
- ✅ Changes applied to both Sidebar and UserHeader components
