# StackIt Frontend

A modern React + Vite frontend for the StackIt Q&A forum platform.

## 🚀 Features

- **Modern UI/UX** with TailwindCSS
- **Authentication** (Login, Register, Password Reset)
- **Question & Answer System** with voting
- **Real-time Updates** via Socket.IO
- **Responsive Design** for all devices
- **Search & Filtering** capabilities
- **Tag System** for question categorization
- **User Profiles** and reputation system
- **Notification System**

## 🛠️ Tech Stack

- **React 19** with Hooks
- **Vite** for fast development and building
- **React Router** for navigation
- **TailwindCSS** for styling
- **Axios** for API calls
- **Socket.IO Client** for real-time features
- **React Hot Toast** for notifications

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Update the `.env` file with your backend URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Visit `http://localhost:5173` to see the application.

## 🔗 API Integration

The frontend is designed to work with the StackIt backend API. Make sure your backend server is running on `http://localhost:5000`.

## 📱 Responsive Design

The interface is fully responsive and works on desktop, tablet, and mobile devices.

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
