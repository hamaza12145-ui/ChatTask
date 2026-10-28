'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../App').then((mod) => mod.App), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center space-y-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading TaskCom Workspace...</p>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return <App />;
}
