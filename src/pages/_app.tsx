// 1. UPDATED _app.tsx with comprehensive SEO
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
        {/* Primary Meta Tags */}
        <title>GradelyLabs AI - AI-Powered Lab Report Generator</title>
        <meta name="title" content="GradelyLabs AI - AI-Powered Lab Report Generator" />
        <meta name="description" content="Generate professional lab reports in minutes with AI. Upload your lab manual and data, get comprehensive reports with charts, analysis, and proper academic formatting." />
        <meta name="keywords" content="lab report generator, AI lab reports, student lab reports, laboratory report writing, academic writing AI, science lab reports" />
        <meta name="robots" content="index, follow" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="language" content="English" />
        <meta name="author" content="GradelyLabs" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicon - Comprehensive setup */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gradelylabs.com/" />
        <meta property="og:title" content="GradelyLabs AI - AI-Powered Lab Report Generator" />
        <meta property="og:description" content="Generate professional lab reports in minutes with AI. Upload your lab manual and data, get comprehensive reports with charts, analysis, and proper academic formatting." />
        <meta property="og:image" content="https://gradelylabs.com/og-image.png" />
        <meta property="og:site_name" content="GradelyLabs AI" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://gradelylabs.com/" />
        <meta property="twitter:title" content="GradelyLabs AI - AI-Powered Lab Report Generator" />
        <meta property="twitter:description" content="Generate professional lab reports in minutes with AI. Upload your lab manual and data, get comprehensive reports with charts, analysis, and proper academic formatting." />
        <meta property="twitter:image" content="https://gradelylabs.com/og-image.png" />

        {/* Additional SEO */}
        <meta name="theme-color" content="#00e3ae" />
        <meta name="msapplication-TileColor" content="#00e3ae" />
        <link rel="canonical" href="https://gradelylabs.com/" />
        
        {/* Structured Data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "GradelyLabs AI",
              "description": "AI-Powered Lab Report Generator for Students",
              "url": "https://gradelylabs.com",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "GradelyLabs"
              }
            })
          }}
        />
      </Head>
      
      <ErrorBoundary>
        <SessionProvider session={session}>
          <Component {...pageProps} />
        </SessionProvider>
      </ErrorBoundary>
    </>
  );
}