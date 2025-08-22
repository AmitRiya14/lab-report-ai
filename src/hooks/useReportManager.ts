// src/hooks/useReportManager.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';

interface ReportData {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

interface UseReportManagerReturn {
  currentReportId: string | null;
  loading: boolean;
  error: string | null;
  loadReport: (reportId: string) => Promise<void>;
  saveCurrentReport: () => Promise<void>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
}

export const useReportManager = (
  editorRef: React.RefObject<HTMLDivElement | null>,
  setReportText: (text: string) => void,
  setTitle: (title: string) => void,
  setVersionHistory: React.Dispatch<React.SetStateAction<any[]>>
): UseReportManagerReturn => {
  const router = useRouter();
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && currentReportId) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (5 seconds after last change)
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 5000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, currentReportId]);

  // Initialize from URL params if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportIdFromUrl = urlParams.get('reportId');
    
    if (reportIdFromUrl && !currentReportId) {
      loadReport(reportIdFromUrl);
    }
  }, []);

  const handleAutoSave = useCallback(async () => {
    if (!currentReportId || !hasUnsavedChanges) return;

    setAutoSaveStatus('saving');
    try {
      await saveCurrentReport();
      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
    }
  }, [currentReportId, hasUnsavedChanges]);

  const loadReport = useCallback(async (reportId: string) => {
    // Prevent loading the same report
    if (currentReportId === reportId) {
      return;
    }

    if (hasUnsavedChanges) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes. Are you sure you want to switch reports? Your changes will be lost.'
      );
      if (!confirmSwitch) {
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${reportId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Report not found');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this report');
        } else {
          throw new Error('Failed to load report');
        }
      }

      const reportData: ReportData = await response.json();

      // Update the editor with the loaded report
      if (editorRef.current) {
        try {
          // Convert markdown to HTML if needed
          const htmlContent = reportData.content.includes('<p>') 
            ? reportData.content 
            : await marked.parse(reportData.content);
          
          editorRef.current.innerHTML = htmlContent;
          setReportText(htmlContent);
        } catch (parseError) {
          console.error('Failed to parse report content:', parseError);
          // Fallback to plain text
          editorRef.current.innerText = reportData.content;
          setReportText(reportData.content);
        }
      }

      // Update title
      setTitle(reportData.title || 'Lab Report');

      // Update localStorage with the loaded report
      localStorage.setItem('labReport', reportData.content);
      localStorage.setItem('reportTitle', reportData.title || 'Lab Report');
      localStorage.setItem('currentReportId', reportId);

      // Clear any stored chart/rubric data from previous report
      localStorage.removeItem('chartSpec');
      localStorage.removeItem('rubricText');
      localStorage.removeItem('lastRubricAnalysis');

      // Load associated data if available in metadata
      if (reportData.metadata) {
        if (reportData.metadata.chartSpec) {
          localStorage.setItem('chartSpec', JSON.stringify(reportData.metadata.chartSpec));
        }
        if (reportData.metadata.rubricText) {
          localStorage.setItem('rubricText', reportData.metadata.rubricText);
        }
      }

      // Reset version history with this report as the base
      setVersionHistory([
        {
          timestamp: new Date(reportData.updated_at).toLocaleString(),
          summary: 'Loaded from saved report',
          content: reportData.content,
        }
      ]);

      // Update current report ID
      setCurrentReportId(reportId);
      setHasUnsavedChanges(false);
      setAutoSaveStatus('idle');

      // Update URL to reflect the loaded report
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('reportId', reportId);
      window.history.replaceState({}, '', currentUrl.toString());

      console.log('✅ Report loaded successfully:', reportData.title);

    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
      
      // Show user-friendly error
      alert(`Failed to load report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [editorRef, setReportText, setTitle, setVersionHistory, hasUnsavedChanges, currentReportId]);

  const saveCurrentReport = useCallback(async () => {
    if (!currentReportId || !editorRef.current) {
      console.warn('No current report to save or no editor content');
      return;
    }

    try {
      const content = editorRef.current.innerHTML;
      const title = localStorage.getItem('reportTitle') || 'Lab Report';

      // Gather metadata to save
      const metadata: any = {};
      
      const chartSpec = localStorage.getItem('chartSpec');
      if (chartSpec) {
        try {
          metadata.chartSpec = JSON.parse(chartSpec);
        } catch (e) {
          console.warn('Failed to parse chart spec for saving');
        }
      }

      const rubricText = localStorage.getItem('rubricText');
      if (rubricText) {
        metadata.rubricText = rubricText;
      }

      const response = await fetch(`/api/reports/update/${currentReportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save report');
      }

      setHasUnsavedChanges(false);
      console.log('✅ Report saved successfully');

    } catch (err) {
      console.error('Failed to save report:', err);
      throw err; // Re-throw for caller to handle
    }
  }, [currentReportId, editorRef]);

  return {
    currentReportId,
    loading,
    error,
    loadReport,
    saveCurrentReport,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    autoSaveStatus,
    lastSaved,
  };
};