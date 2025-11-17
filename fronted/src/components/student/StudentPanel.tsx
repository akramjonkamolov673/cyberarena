import { useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";

interface UserData {
  profileImage?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  groupName?: string | null;
}

interface StudentPanelProps {
  onLogout: () => void;
}

export default function StudentPanel({ onLogout }: StudentPanelProps) {
  const navigate = useNavigate();
  const [userData] = useState<UserData | null>(() => {
    const saved = localStorage.getItem("userData");
    return saved ? JSON.parse(saved) : null;
  });
  const [showDropdown, setShowDropdown] = useState(false);

  if (!userData) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-xl">
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-semibold text-blue-600">
            Talaba Paneli
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigate('/student')}
              className={`px-4 py-2 rounded-md ${
                window.location.pathname === '/student' || window.location.pathname === '/student/'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Savollar
            </button>
            <button
              onClick={() => navigate('/student/codetrain')}
              className={`px-4 py-2 rounded-md ${
                window.location.pathname.startsWith('/student/codetrain')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              CodeTrain
            </button>
            <button
              onClick={() => navigate('/student/codebattle')}
              className={`px-4 py-2 rounded-md ${
                window.location.pathname === '/student/codebattle'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              CodeBattle
            </button>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              {userData?.profileImage ? (
                <img
                  src={userData.profileImage}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <i className="fa fa-user text-gray-600"></i>
                </div>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Chiqish
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
