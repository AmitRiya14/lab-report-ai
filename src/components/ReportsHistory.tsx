// src/components/ReportsHistory.tsx
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Calendar,
  Eye,
  BarChart3,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ReportMetadata {
  id: string;
  title: string;
  preview: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  has_chart: boolean;
  file_types: string[];
}

interface ReportsHistoryProps {
  onReportSelect: (reportId: string) => void;
  currentReportId?: string;
}

export const ReportsHistory: React.FC<ReportsHistoryProps> = ({ 
  onReportSelect, 
  currentReportId 
}) => {
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [recentReports, setRecentReports] = useState<ReportMetadata[]>([]);
  const [allReports, setAllReports] = useState<ReportMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Load recent reports on mount
  useEffect(() => {
    if (session?.user?.email) {
      loadRecentReports();
    }
  }, [session?.user?.email]);

  // Remember user's expanded preference
  useEffect(() => {
    const savedExpanded = localStorage.getItem('reportsHistoryExpanded');
    if (savedExpanded === 'true') {
      setIsExpanded(true);
      loadAllReports();
    }
  }, []);

  const loadRecentReports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reports/list?recent=true');
      
      if (!response.ok) {
        throw new Error('Failed to load recent reports');
      }
      
      const data = await response.json();
      setRecentReports(data.reports || []);
      setTotalCount(data.total || 0);
      
    } catch (err) {
      console.error('Recent reports load error:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadAllReports = async (offset = 0) => {
    if (offset === 0) {
      setLoadingMore(true);
    }
    
    try {
      const response = await fetch(`/api/reports/list?limit=10&offset=${offset}`);
      
      if (!response.ok) {
        throw new Error('Failed to load reports');
      }
      
      const data = await response.json();
      
      if (offset === 0) {
        setAllReports(data.reports || []);
      } else {
        setAllReports(prev => [...prev, ...(data.reports || [])]);
      }
      
      setHasMore(data.hasMore || false);
      setTotalCount(data.total || 0);
      
    } catch (err) {
      console.error('All reports load error:', err);
      setError('Failed to load more reports');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    localStorage.setItem('reportsHistoryExpanded', newExpanded.toString());
    
    if (newExpanded && allReports.length === 0) {
      loadAllReports();
    }
  };

  const handleLoadMore = () => {
    loadAllReports(allReports.length);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 86400 * 7) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredReports = allReports.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.preview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ReportItem: React.FC<{ report: ReportMetadata }> = ({ report }) => (
    <button
      onClick={() => onReportSelect(report.id)}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 hover:bg-gray-50 group ${
        currentReportId === report.id ? 'bg-[#00e3ae]/10 border border-[#00e3ae]/30' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <FileText size={14} className="text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm truncate group-hover:text-[#00e3ae]">
            {report.title}
          </div>
          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
            {report.preview}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatTimeAgo(report.created_at)}
            </span>
            {report.has_chart && (
              <span className="flex items-center gap-1 text-blue-500">
                <BarChart3 size={12} />
                Chart
              </span>
            )}
            <span>{report.word_count} words</span>
          </div>
        </div>
      </div>
    </button>
  );

  if (!session?.user?.email) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleExpand}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Previous Reports
          {totalCount > 0 && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {totalCount}
            </span>
          )}
        </button>
        
        {isExpanded && totalCount > 3 && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Search size={14} />
          </button>
        )}
      </div>

      {/* Search Bar */}
      {showSearch && isExpanded && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#00e3ae] focus:ring-2 focus:ring-[#00e3ae]/20"
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading reports...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Recent Reports (Always Visible) */}
      {!loading && !isExpanded && recentReports.length > 0 && (
        <div className="space-y-2">
          {recentReports.map((report) => (
            <ReportItem key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* All Reports (When Expanded) */}
      {isExpanded && !loading && (
        <div className="space-y-2">
          {searchTerm ? (
            <>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <ReportItem key={report.id} report={report} />
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No reports found matching "{searchTerm}"
                </div>
              )}
            </>
          ) : (
            <>
              {allReports.map((report) => (
                <ReportItem key={report.id} report={report} />
              ))}
              
              {/* Load More Button */}
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-sm text-[#00e3ae] hover:text-[#00d49a] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `Load More (${totalCount - allReports.length} remaining)`
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && totalCount === 0 && (
        <div className="text-center py-6 text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No reports generated yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload files to create your first report</p>
        </div>
      )}
    </div>
  );
};