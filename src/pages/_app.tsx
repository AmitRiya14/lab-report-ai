import type { AppProps } from 'next/app';
import { SessionProvider } from "next-auth/react";
import { ErrorBoundary } from '@/components/ErrorBoundary'; // Add this import
import '../styles/globals.css';

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <ErrorBoundary> {/* Wrap with ErrorBoundary */}
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </ErrorBoundary>
  );
}