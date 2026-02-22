import { Link } from 'react-router-dom';
import { FileSignature, Home, Search } from 'lucide-react';
import { ROUTES } from '../../utils/constants';

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* 404 Visual */}
        <div className="relative">
          <div className="text-[8rem] font-black text-slate-200 leading-none select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-white p-6 shadow-xl border-2 border-slate-300">
              <FileSignature className="h-16 w-16 text-teal-600 mx-auto mb-3" />
              <p className="text-slate-900 font-bold text-lg">Page not found</p>
            </div>
          </div>
        </div>

        {/* Message */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Oops! Something went wrong</h1>
          <p className="text-slate-600">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={ROUTES.DASHBOARD}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 transition-colors shadow-lg"
          >
            <Home className="h-5 w-5" />
            Go to Dashboard
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 px-6 transition-colors"
          >
            <Search className="h-5 w-5" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
