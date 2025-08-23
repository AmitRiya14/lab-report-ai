import dynamic from "next/dynamic";
import Head from "next/head";

const LabUploader = dynamic(() => import("../components/LabUploader"), { ssr: false });

export default function HomePage() {
  return (
    <>
      <Head>
        {/* Page-specific SEO for homepage */}
        <title>GradelyLabs AI - Generate Professional Lab Reports with AI</title>
        <meta 
          name="description" 
          content="Transform your lab work into professional reports in minutes. AI-powered lab report generator for students. Upload your data, get formatted reports with charts and analysis." 
        />
        <meta 
          name="keywords" 
          content="lab report generator, AI lab reports, student lab reports, laboratory report writing, academic writing AI, science lab reports" 
        />
        <link rel="canonical" href="https://gradelylabs.com/" />

        {/* Open Graph for social sharing */}
        <meta property="og:title" content="GradelyLabs AI - Generate Professional Lab Reports with AI" />
        <meta property="og:description" content="Transform your lab work into professional reports in minutes. Upload your data, get AI-generated reports with charts and analysis." />
        <meta property="og:image" content="https://gradelylabs.com/og-image.png" />
        <meta property="og:url" content="https://gradelylabs.com/" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GradelyLabs AI - Generate Professional Lab Reports with AI" />
        <meta name="twitter:description" content="Transform your lab work into professional reports in minutes. Upload your data, get AI-generated reports." />
        <meta name="twitter:image" content="https://gradelylabs.com/og-image.png" />

        {/* STRUCTURED DATA - THIS GOES HERE IN YOUR HOMEPAGE */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "GradelyLabs AI Lab Report Generator",
              "description": "AI-powered tool that generates professional lab reports from your experimental data and lab manuals",
              "url": "https://gradelylabs.com",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "AI-powered report generation",
                "Chart and graph creation", 
                "Academic formatting",
                "Multiple export formats",
                "Rubric-based analysis"
              ],
              "creator": {
                "@type": "Organization",
                "name": "GradelyLabs",
                "url": "https://gradelylabs.com"
              },
              "screenshot": "https://gradelylabs.com/app-screenshot.png"
            })
          }}
        />
      </Head>
      
      <LabUploader />
    </>
  );
}
