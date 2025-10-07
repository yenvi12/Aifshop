export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-75">
      <div className="animate-spin rounded-full h-32 w-32 border-t-8 border-b-8 border-brand-primary"></div>
      <p className="mt-6 text-2xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-wider animate-pulse">
        Loading...
      </p>
    </div>
  );
}
