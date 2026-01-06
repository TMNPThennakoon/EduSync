# Classroom Attendance & Gradebook - Frontend

A modern React-based frontend application for managing classroom attendance and gradebook functionality.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Start Development Server**
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🎨 Features

### User Interface
- **Responsive Design** - Mobile-friendly interface
- **Modern UI** - Clean and intuitive design with Tailwind CSS
- **Dark/Light Mode** - Theme switching capability
- **Accessibility** - WCAG compliant components

### User Experience
- **Real-time Updates** - Live data updates using React Query
- **Form Validation** - Client-side validation with React Hook Form
- **Loading States** - Smooth loading indicators
- **Error Handling** - User-friendly error messages
- **Toast Notifications** - Success/error feedback

### Role-based Interface
- **Admin Dashboard** - Complete system management
- **Lecturer Interface** - Class and student management
- **Student Portal** - Personal grades and attendance

## 🛠️ Tech Stack

- **React 18** - UI library
- **React Router 6** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hook Form** - Form handling
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Hot Toast** - Toast notifications
- **Axios** - HTTP client

## 📱 Pages & Components

### Authentication
- **Login Page** - User authentication
- **Register Page** - User registration
- **Profile Page** - User profile management

### Dashboard
- **Admin Dashboard** - System overview and statistics
- **Lecturer Dashboard** - Class and student overview
- **Student Dashboard** - Personal academic overview

### Class Management
- **Classes List** - View all classes
- **Class Details** - Detailed class information
- **Student Enrollment** - Manage student enrollments

### Attendance
- **Attendance Tracking** - Record and view attendance
- **Attendance Reports** - Generate attendance reports
- **Bulk Attendance** - Mass attendance recording

### Assignments
- **Assignment List** - View all assignments
- **Assignment Details** - Assignment information and grades
- **Create Assignment** - Add new assignments

### Grades
- **Grade Management** - View and manage grades
- **Student Grades** - Individual student grade history
- **Grade Analytics** - Performance statistics

### Reports
- **Daily Reports** - Daily attendance reports
- **Monthly Reports** - Monthly attendance summaries
- **Grade Reports** - Academic performance reports

## 🎨 Design System

### Colors
- **Primary**: Blue (#3B82F6)
- **Secondary**: Gray (#64748B)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)

### Typography
- **Font Family**: Inter
- **Headings**: Font weights 600-700
- **Body**: Font weight 400
- **Captions**: Font weight 500

### Components
- **Buttons**: Multiple variants (primary, secondary, danger)
- **Cards**: Consistent card layouts
- **Forms**: Styled form inputs and validation
- **Tables**: Responsive data tables
- **Modals**: Overlay dialogs
- **Badges**: Status indicators

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```bash
REACT_APP_API_URL=http://localhost:5000/api
```

### API Integration
The frontend communicates with the backend API through:
- **Axios** - HTTP client with interceptors
- **React Query** - Data fetching and caching
- **Error Handling** - Centralized error management

## 📦 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 🎯 Key Features

### State Management
- **Context API** - Global state management
- **React Query** - Server state management
- **Local Storage** - Persistent user data

### Form Handling
- **React Hook Form** - Efficient form management
- **Validation** - Client-side validation
- **Error Display** - User-friendly error messages

### Data Fetching
- **React Query** - Caching and synchronization
- **Optimistic Updates** - Immediate UI updates
- **Background Refetching** - Automatic data updates

### Responsive Design
- **Mobile First** - Mobile-optimized design
- **Breakpoints** - Responsive breakpoints
- **Flexible Layouts** - Adaptive components

## 🚀 Performance

### Optimization
- **Code Splitting** - Lazy loading of components
- **Memoization** - React.memo for expensive components
- **Bundle Analysis** - Webpack bundle analyzer
- **Image Optimization** - Optimized image loading

### Caching
- **React Query Cache** - Intelligent data caching
- **Local Storage** - Persistent user preferences
- **Service Worker** - Offline functionality (future)

## 🔒 Security

### Authentication
- **JWT Tokens** - Secure authentication
- **Token Refresh** - Automatic token renewal
- **Route Protection** - Protected routes based on roles

### Data Validation
- **Client-side Validation** - Immediate feedback
- **Server-side Validation** - Backend validation
- **Input Sanitization** - XSS prevention

## 🧪 Testing

### Test Setup
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Testing Tools
- **Jest** - Testing framework
- **React Testing Library** - Component testing
- **User Event** - User interaction testing

## 📱 Mobile Support

### Responsive Design
- **Mobile Navigation** - Collapsible sidebar
- **Touch-friendly** - Optimized for touch devices
- **Gesture Support** - Swipe and touch gestures

### PWA Features (Future)
- **Service Worker** - Offline functionality
- **App Manifest** - Installable app
- **Push Notifications** - Real-time updates

## 🎨 Customization

### Theming
- **Tailwind Config** - Customizable design tokens
- **CSS Variables** - Dynamic theming
- **Component Variants** - Flexible component styles

### Branding
- **Logo** - Customizable logo
- **Colors** - Brand color customization
- **Typography** - Font customization

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deployment Options
- **Netlify** - Static site hosting
- **Vercel** - React-optimized hosting
- **AWS S3** - Static website hosting
- **GitHub Pages** - Free hosting

### Environment Configuration
```bash
# Production environment
REACT_APP_API_URL=https://your-api-domain.com/api
```

## 🔧 Development

### Code Structure
```
src/
├── components/     # Reusable components
├── contexts/       # React contexts
├── pages/          # Page components
├── services/       # API services
├── utils/          # Utility functions
├── hooks/          # Custom hooks
└── styles/         # Global styles
```

### Best Practices
- **Component Composition** - Reusable components
- **Custom Hooks** - Logic extraction
- **Error Boundaries** - Error handling
- **TypeScript** - Type safety (future)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

---

**Note**: This frontend application is designed to work seamlessly with the Classroom Attendance & Gradebook backend API. Make sure the backend is running and properly configured before starting the frontend development server.
