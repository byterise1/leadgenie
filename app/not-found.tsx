import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:text-white">
      <Navbar />
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center px-4">
          <p className="text-6xl font-extrabold text-blue-600 mb-4">404</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Page not found</h1>
          <p className="text-gray-500 dark:text-gray-500 text-base max-w-sm mx-auto mb-8 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist. It may have moved or the URL might be wrong.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/"
              className="bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Back to Home
            </Link>
            <Link href="/help"
              className="border border-gray-200 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Help Center
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
