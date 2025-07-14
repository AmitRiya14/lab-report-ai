import Link from "next/link";

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 px-6 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-red-700 mb-4">⚠️ Upload Failed</h1>
      <p className="text-gray-700 max-w-md mb-6">
        Something went wrong while uploading your files. Please check your internet connection, file types, or try again later.
      </p>
      <Link
        href="/"
        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
      >
        Back to Home
      </Link>
    </div>
  );
}
