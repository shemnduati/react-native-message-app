# React Native Message App

A real-time messaging application built with React Native (Expo) and Laravel API.

## Features

- 🔐 User authentication (login/register)
- 💬 Real-time messaging
- 👥 Group chats
- 📱 Modern mobile UI with dark/light themes
- 🔄 Pull-to-refresh
- 📎 File attachments (planned)
- 🎨 Responsive design

## Project Structure

```
react-native-message-app/
├── api/                 # Laravel API Backend
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   ├── Models/
│   │   └── Events/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/
└── app/                 # React Native App
    ├── app/
    │   ├── (auth)/      # Authentication screens
    │   ├── (app)/       # Main app screens
    │   └── chat/        # Chat screens
    ├── context/         # React contexts
    ├── services/        # API services
    └── hooks/           # Custom hooks
```

## Prerequisites

- Node.js (v18 or higher)
- PHP (v8.2 or higher)
- Composer
- Expo CLI
- MySQL/PostgreSQL database

## Setup Instructions

### 1. API Backend Setup

```bash
# Navigate to API directory
cd api

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure database in .env file
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=message_app
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Run migrations
php artisan migrate

# Install Laravel Sanctum (for API authentication)
composer require laravel/sanctum

# Publish Sanctum configuration
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Run migrations again for Sanctum
php artisan migrate

# Start the development server
php artisan serve
```

### 2. React Native App Setup

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Start the development server
npm start
```

### 3. Environment Configuration

Update the API base URL in `app/services/api.ts`:

```typescript
const API_BASE_URL = 'http://your-api-url:8000/api';
```

For local development, use:
- iOS Simulator: `http://localhost:8000/api`
- Android Emulator: `http://10.0.2.2:8000/api`
- Physical Device: `http://your-computer-ip:8000/api`

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `POST /api/logout` - User logout

### User Management
- `GET /api/user` - Get current user profile
- `PUT /api/user` - Update user profile

### Conversations
- `GET /api/conversations` - Get all conversations

### Messages
- `GET /api/messages/user/{user}` - Get messages with a user
- `GET /api/messages/group/{group}` - Get messages in a group
- `POST /api/messages` - Send a message
- `DELETE /api/messages/{message}` - Delete a message

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create a new group
- `PUT /api/groups/{group}` - Update group
- `DELETE /api/groups/{group}` - Delete group

## Real-time Features

The app is designed to support real-time messaging. To implement this:

1. **WebSocket Setup**: Install and configure Laravel WebSockets or Pusher
2. **Event Broadcasting**: Configure the `SocketMessage` event
3. **React Native WebSocket**: Use `react-native-websocket` or similar

## Development Roadmap

### Phase 1: Core Features ✅
- [x] User authentication
- [x] Basic UI structure
- [x] API integration
- [x] Theme support

### Phase 2: Messaging (In Progress)
- [ ] Real-time chat implementation
- [ ] Message sending/receiving
- [ ] Chat UI components
- [ ] Message history

### Phase 3: Advanced Features
- [ ] File attachments
- [ ] Push notifications
- [ ] Message search
- [ ] User status (online/offline)
- [ ] Message reactions
- [ ] Voice messages

### Phase 4: Polish
- [ ] Performance optimization
- [ ] Error handling
- [ ] Unit tests
- [ ] E2E tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository. 