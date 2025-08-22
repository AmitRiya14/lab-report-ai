import type { AppProps } from 'next/app';
import Head from 'next/head';
import { SessionProvider } from "next-auth/react";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '../styles/globals.css';

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <>
      <Head>
        {/* Favicon - Modern approach with SVG + ICO fallback */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Theme color for mobile browsers - matches your brand */}
        <meta name="theme-color" content="#00e3ae" />
        
        {/* App metadata */}
        <meta name="application-name" content="GradelyLabs AI" />
        <meta name="description" content="AI-Powered Lab Report Generator for Students" />
        
        {/* Viewport for responsive design */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <ErrorBoundary>
        <SessionProvider session={session}>
          <Component {...pageProps} />
        </SessionProvider>
      </ErrorBoundary>
    </>
  );
}