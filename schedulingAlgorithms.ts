import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cpu, Layers, LayoutDashboard } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'General Scheduler', icon: LayoutDashboard },
    { path: '/mlfq', label: 'MLFQ Specialized', icon: Layers },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-[50]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
              <Cpu className="text-white" size={20} />
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">OS Scheduler <span className="text-blue-600">Pro</span></span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  location.pathname === item.path
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                <item.icon size={18} />
                <span className="hidden md:inline-block">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-8 text-center text-slate-400 text-sm font-medium">
          &copy; 2026 OS Scheduler Pro. Built for Operating Systems Education.
        </div>
      </footer>
    </div>
  );
}
