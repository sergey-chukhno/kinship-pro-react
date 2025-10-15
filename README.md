# Kinship Dashboard - React Version

This is a React conversion of the original HTML/CSS/JavaScript Kinship Admin Dashboard. The application has been faithfully recreated to maintain the exact same design, functionality, and user experience as the original.

## Features

### 🎯 Core Functionality
- **Dashboard**: Overview with statistics, charts, and recent activity
- **Members Management**: Complete CRUD operations for member management
- **Projects**: Project creation, management, and tracking
- **Events**: Event scheduling and calendar functionality
- **Badges**: Badge system with multiple levels and categories
- **Network**: Organization and network management
- **Notifications**: Real-time notification system
- **Settings**: Application configuration

### 🎨 Design System
- **Exact Visual Reproduction**: Maintains the original design system
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Theme Support**: Light and dark theme support
- **Component Library**: Reusable UI components
- **Accessibility**: WCAG compliant design

### 🏗️ Technical Architecture
- **React 18** with TypeScript
- **Context API** for state management
- **Modular Components** for maintainability
- **CSS Modules** for styling isolation
- **API-Ready Structure** for backend integration

## Project Structure

```
src/
├── components/
│   ├── Layout/           # Main layout components
│   ├── Pages/            # Page components
│   ├── Members/          # Member-specific components
│   ├── Projects/          # Project-specific components
│   ├── Modals/           # Modal dialogs
│   └── UI/               # Reusable UI components
├── context/              # React Context for state management
├── types/                # TypeScript type definitions
├── data/                 # Mock data and constants
└── styles/               # CSS styles
```

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
cd react-dashboard
npm install
```

### Development
```bash
npm start
```
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
```
Creates an optimized production build in the `build` folder.

## Key Components

### State Management
- **AppContext**: Global state management using React Context
- **Actions**: CRUD operations for all entities
- **Filters**: Advanced filtering system
- **Theme**: Light/dark theme switching

### UI Components
- **Sidebar**: Navigation with user profile
- **MemberCard**: Member display with role management
- **ProjectCard**: Project overview with status
- **RolePill**: Interactive role badges
- **Modals**: Member management, contact, and forms

### Pages
- **Dashboard**: Statistics and analytics
- **Members**: Member management with search and filters
- **Projects**: Project grid with management actions
- **Events**: Calendar and event management
- **Badges**: Badge system management
- **Network**: Organization network
- **Notifications**: Notification center
- **Settings**: Application settings

## API Integration Ready

The application is structured to easily integrate with a Ruby on Rails backend:

### Data Flow
- **Context API** manages all state
- **Mock Data** can be replaced with API calls
- **Type Definitions** match backend models
- **CRUD Operations** ready for API integration

### Integration Points
- Replace mock data in `src/data/mockData.ts`
- Add API service layer
- Update context actions to call APIs
- Add loading states and error handling

## Design System

### Colors
- **Primary**: #5570F1 (Blue)
- **Secondary**: #524c9c (Purple)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Orange)
- **Error**: #ef4444 (Red)

### Typography
- **Font Family**: Poppins
- **Weights**: 400, 600, 700
- **Sizes**: Responsive scale

### Components
- **Buttons**: Primary, outline, secondary variants
- **Cards**: Elevated with hover effects
- **Modals**: Centered with backdrop
- **Forms**: Consistent styling and validation
- **Pills**: Role and status indicators

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development Notes

### TypeScript
- Strict type checking enabled
- Interface definitions for all data models
- Generic types for reusable components

### CSS Architecture
- Original CSS preserved for exact reproduction
- Component-specific styles in separate files
- CSS custom properties for theming
- Responsive design patterns

### Performance
- React.memo for expensive components
- Lazy loading for large datasets
- Optimized bundle size
- Efficient re-rendering

## Future Enhancements

### Planned Features
- Real-time notifications with WebSocket
- Advanced analytics and reporting
- Export functionality (PDF, CSV)
- Bulk operations
- Advanced search and filtering
- Mobile app integration

### API Integration
- RESTful API endpoints
- Authentication and authorization
- File upload handling
- Real-time data synchronization
- Offline support

## Contributing

1. Follow the existing code structure
2. Maintain TypeScript types
3. Preserve the original design system
4. Add tests for new features
5. Update documentation

## License

This project is part of the Kinship educational platform.