# Labify - AI-Powered Lab Report Generator

Labify is a Next.js application that uses AI to generate professional lab reports from raw lab data.

## Features

- AI-powered lab report generation
- Clean, responsive UI built with Next.js and Tailwind CSS
- Dashboard to view and manage reports
- Subscription management

## Setup Instructions

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Claude API Key
CLAUDE_API_KEY=your_claude_api_key_here

# Add any other environment variables here
```

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/labify.git
cd labify
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - Reusable UI components
- `/src/lib` - Utility functions and API integrations
- `/src/types` - TypeScript type definitions

## Key Components

- `/app/dashboard` - Main dashboard for viewing reports
- `/app/generate-report` - Page for generating new lab reports
- `/app/subscription` - Subscription management
- `/app/api` - API routes for report generation

## API Integration

The application uses Anthropic's Claude API for AI-powered report generation. You'll need to:

1. Create an Anthropic account at [https://www.anthropic.com/](https://www.anthropic.com/)
2. Obtain an API key
3. Add the API key to your `.env.local` file

## Production Deployment

For production deployment, we recommend using Vercel:

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Configure environment variables in the Vercel dashboard
4. Deploy

## License

[MIT](LICENSE)