// mcpServer_cemtemChat/frontend/src/App.jsx

import './index.css';
import { Bot, Link} from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 antialiased">
      <div className="bg-gray-900 rounded-3xl shadow-2xl p-8 sm:p-12 md:p-16 max-w-2xl w-full text-center border border-gray-800">
        
        {/* Logo and Title */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className="bg-primary text-white p-3 rounded-full shadow-lg flex items-center justify-center">
            <Bot className="h-8 w-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            CemTemBot
          </h1>
        </div>

        {/* Main Content */}
        <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-prose mx-auto leading-relaxed">
          Welcome to the **CemTemBot API Server**. This dedicated service centralizes AI logic and business data to provide intelligent, context-aware responses for your internal dashboards.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <a
            href="https://salesmancms-dashboard.onrender.com" // Replace with your actual dashboard URL
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-colors duration-300 font-semibold text-white shadow-lg flex items-center justify-center"
          >
            <Link className="h-5 w-5 mr-2" />
            Go to Dashboard
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-sm text-gray-600">
        &copy; {new Date().getFullYear()} CemTemBot. All rights reserved.
      </footer>
    </div>
  );
}
