# Band Rehearsal Scheduler

A comprehensive web application designed to help bands, orchestras, and music groups efficiently schedule rehearsals, track attendance, send reminders, and suggest optimal rehearsal times based on member availability.

## 🎵 Features

### Core Functionality
- **User Authentication and Profile Management**
  - Secure login and registration
  - Detailed musician profiles with instrument/role specification
  - Band/group creation and management
  
- **Rehearsal Scheduling**
  - Create, edit, and delete rehearsal events
  - Set location, duration, and rehearsal details
  - Support for recurring rehearsals
  
- **Availability Management**
  - Regular availability settings (weekly schedule)
  - One-time availability exceptions
  - Calendar integration (Google, Apple, Outlook)
  
- **Attendance Tracking**
  - One-click RSVP functionality (confirm/decline/maybe)
  - Attendance history and statistics
  - Automated follow-up for non-respondents
  
- **Smart Scheduling**
  - Algorithm to suggest optimal rehearsal times based on member availability
  - Conflict detection and resolution
  - Alternative time suggestions
  
- **Notification System**
  - Email and in-app reminders for upcoming rehearsals
  - Changes to rehearsal details notification
  - Customizable notification preferences
  
- **Rehearsal Notes and Resources**
  - Attach setlists, sheet music, and notes to rehearsals
  - Post-rehearsal feedback and progress tracking
  - Task assignments for members

## 🚀 Technology Stack

### Frontend
- React.js with TypeScript
- Redux for state management
- Material-UI for responsive design
- FullCalendar.js for interactive scheduling
- Formik with Yup for form validation

### Backend
- Node.js with Express
- JWT-based authentication with OAuth2 social login options
- Joi for request validation

### Database
- PostgreSQL for relational data
- Redis for caching and performance optimization

### DevOps
- Docker for containerization
- AWS/Vercel for hosting
- GitHub Actions for CI/CD
- Sentry for error tracking

## 📊 System Architecture

The system follows a modern microservices architecture:

1. **Client Layer**
   - React.js Single Page Application
   - Progressive Web App capabilities
   - Responsive design for mobile and desktop

2. **API Gateway Layer**
   - Express.js REST API
   - Authentication middleware
   - Rate limiting and security features

3. **Service Layer**
   - User service (authentication, profiles)
   - Scheduler service (create/manage rehearsals)
   - Notification service (emails, reminders)
   - Analytics service (attendance, optimization)

4. **Data Layer**
   - PostgreSQL for persistent storage
   - Redis for caching and real-time features
   - S3 for file storage (sheet music, resources)

5. **External Integration Layer**
   - Calendar API connectors
   - Email/SMS service connectors

## 🛠️ Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- PostgreSQL database
- Redis server
- AWS account (optional, for S3 storage)

### Installation

1. Clone the repository
```bash
git clone https://github.com/dxaginfo/musicband-rehearsal-scheduler-2025.git
cd musicband-rehearsal-scheduler-2025
```

2. Install dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

3. Configure environment variables
```bash
# Create .env file in server directory
cp server/.env.example server/.env
# Edit .env with your database credentials and other settings
```

4. Run database migrations
```bash
cd server
npm run migrate
```

5. Start the development servers
```bash
# Start backend server
cd server
npm run dev

# Start frontend development server
cd ../client
npm start
```

6. Access the application
```
Frontend: http://localhost:3000
Backend API: http://localhost:5000
```

## 📦 Project Structure

```
/
├── client/                  # Frontend React application
│   ├── public/              # Static files
│   ├── src/                 # Source code
│   │   ├── components/      # UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── store/           # Redux store
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Utility functions
│   └── package.json         # Frontend dependencies
│
├── server/                  # Backend Express application
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utility functions
│   │   └── app.js           # Express application setup
│   ├── migrations/          # Database migrations
│   └── package.json         # Backend dependencies
│
├── docker/                  # Docker configuration
│   ├── Dockerfile.client    # Frontend Docker configuration
│   ├── Dockerfile.server    # Backend Docker configuration
│   └── docker-compose.yml   # Docker Compose configuration
│
└── README.md                # Project documentation
```

## 🔑 API Documentation

The API documentation is available at `/api/docs` when running the server locally. It provides details on all available endpoints, request/response formats, and authentication requirements.

## 🧪 Testing

```bash
# Run backend tests
cd server
npm test

# Run frontend tests
cd client
npm test
```

## 🚢 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
Detailed instructions for deploying to various environments (AWS, Vercel, etc.) are available in the [deployment guide](./docs/deployment.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📬 Contact

For questions or support, please open an issue or contact the repository owner.

---

Made with ❤️ for musicians by musicians.