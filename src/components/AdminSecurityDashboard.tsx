// src/components/AdminSecurityDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { Layout } from '@/components/Layout';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Lock,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar,
  MapPin,
  Monitor,
  FileX,
  Ban
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  email: string;
  user_id: string;
  ip_address: string;
  created_at: string;
  metadata: any;
}

interface SecurityStats {
  totalEvents: number;
  criticalEvents: number;
  uniqueUsers: number;
  uniqueIPs: number;
  topEventTypes: { event_type: string; count: number }[];
  recentTrends: { date: string; count: number }[];
}

interface SuspiciousActivity {
  ip_address: string;
  failed_attempts: number;
  last_attempt: string;
  targeted_emails: string[];
}

export const AdminSecurityDashboard: React.FC = () => {
  const { data: session } = useSession();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState('24h');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user is admin
  const isAdmin = session?.user?.email?.endsWith('@gradelylabs.com') || 
                  session?.user?.email === 'admin@gradelylabs.com' ||
                  session?.user?.email === 'security@gradelylabs.com';

  useEffect(() => {
    if (isAdmin) {
      fetchSecurityData();
    }
  }, [isAdmin, timeFilter, eventTypeFilter]);

  const fetchSecurityData = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchSecurityEvents(),
        fetchSuspiciousActivity(),
        fetchSecurityStats()
      ]);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityEvents = async () => {
    try {
      let query = supabase
        .from('admin_security_overview')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply time filter
      if (timeFilter !== 'all') {
        const hours = timeFilter === '24h' ? 24 : timeFilter === '7d' ? 168 : 720; // 30d
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', since);
      }

      // Apply event type filter
      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setSecurityEvents(data || []);
    } catch (error) {
      console.error('Error fetching security events:', error);
    }
  };

  const fetchSuspiciousActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('suspicious_activity')
        .select('*')
        .order('failed_attempts', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSuspiciousActivity(data || []);
    } catch (error) {
      console.error('Error fetching suspicious activity:', error);
    }
  };

  const fetchSecurityStats = async () => {
    try {
      const { data, error } = await supabase
        .from('security_dashboard')
        .select('*')
        .order('event_count', { ascending: false });

      if (error) throw error;
      
      // Transform data for stats
      if (data) {
        const stats: SecurityStats = {
          totalEvents: data.reduce((sum, item) => sum + item.event_count, 0),
          criticalEvents: data.filter(item => 
            ['MALICIOUS_FILE_UPLOAD', 'UNAUTHORIZED_ACCESS', 'SECURITY_POLICY_VIOLATION']
            .includes(item.event_type)
          ).reduce((sum, item) => sum + item.event_count, 0),
          uniqueUsers: data.reduce((sum, item) => sum + (item.unique_users || 0), 0),
          uniqueIPs: data.reduce((sum, item) => sum + (item.unique_ips || 0), 0),
          topEventTypes: data.slice(0, 5).map(item => ({
            event_type: item.event_type,
            count: item.event_count
          })),
          recentTrends: [] // Would need additional query for trends
        };
        setSecurityStats(stats);
      }
    } catch (error) {
      console.error('Error fetching security stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSecurityData();
    setRefreshing(false);
  };

  const exportSecurityData = () => {
    const csvContent = [
      ['Event Type', 'Email', 'IP Address', 'Date', 'Details'],
      ...securityEvents.map(event => [
        event.event_type,
        event.email || 'N/A',
        event.ip_address || 'N/A',
        new Date(event.created_at).toLocaleString(),
        JSON.stringify(event.metadata || {})
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'MALICIOUS_FILE_UPLOAD':
        return <FileX className="w-4 h-4 text-red-500" />;
      case 'FAILED_LOGIN':
        return <Lock className="w-4 h-4 text-orange-500" />;
      case 'UNAUTHORIZED_ACCESS':
        return <Ban className="w-4 h-4 text-red-500" />;
      case 'RATE_LIMIT_EXCEEDED':
        return <Activity className="w-4 h-4 text-yellow-500" />;
      case 'SUSPICIOUS_ACTIVITY':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Shield className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (eventType: string) => {
    const criticalEvents = ['MALICIOUS_FILE_UPLOAD', 'UNAUTHORIZED_ACCESS', 'SECURITY_POLICY_VIOLATION'];
    const highEvents = ['FAILED_LOGIN', 'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED'];
    
    if (criticalEvents.includes(eventType)) return 'bg-red-100 text-red-800 border-red-200';
    if (highEvents.includes(eventType)) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const filteredEvents = securityEvents.filter(event => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        event.email?.toLowerCase().includes(search) ||
        event.ip_address?.toLowerCase().includes(search) ||
        event.event_type.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (!isAdmin) {
    return (
      <Layout currentPage="dashboard" userTier="Free">
        <div className="flex-1 bg-[#f9fdfc] flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access the security dashboard.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="dashboard" userTier="Pro">
      <div className="flex-1 bg-[#f9fdfc] p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                Security Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Monitor security events and system activity</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportSecurityData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {securityStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold text-gray-900">{securityStats.totalEvents.toLocaleString()}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Critical Events</p>
                    <p className="text-2xl font-bold text-red-600">{securityStats.criticalEvents}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unique Users</p>
                    <p className="text-2xl font-bold text-gray-900">{securityStats.uniqueUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unique IPs</p>
                    <p className="text-2xl font-bold text-gray-900">{securityStats.uniqueIPs}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Events</option>
                  <option value="FAILED_LOGIN">Failed Logins</option>
                  <option value="MALICIOUS_FILE_UPLOAD">Malicious Uploads</option>
                  <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                  <option value="RATE_LIMIT_EXCEEDED">Rate Limits</option>
                  <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Security Events */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Recent Security Events
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="p-6 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">Loading events...</p>
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="p-6 text-center">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">No security events found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredEvents.map((event) => (
                        <div key={event.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {getEventIcon(event.event_type)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(event.event_type)}`}>
                                    {event.event_type.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">
                                  {event.email !== '[REDACTED]' && event.email ? (
                                    <>User: <span className="font-medium">{event.email}</span></>
                                  ) : (
                                    'Anonymous user'
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">
                                  IP: {event.ip_address || 'Unknown'} • {new Date(event.created_at).toLocaleString()}
                                </p>
                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-blue-600 cursor-pointer">View details</summary>
                                    <pre className="text-xs text-gray-600 mt-1 bg-gray-100 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(event.metadata, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Suspicious Activity */}
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Suspicious IPs
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {suspiciousActivity.length === 0 ? (
                    <div className="p-6 text-center">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      <p className="text-gray-500">No suspicious activity detected</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {suspiciousActivity.map((activity, index) => (
                        <div key={index} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{activity.ip_address}</span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              {activity.failed_attempts} attempts
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            Last: {new Date(activity.last_attempt).toLocaleString()}
                          </p>
                          {activity.targeted_emails?.length > 0 && (
                            <div className="text-xs text-gray-600">
                              <p className="font-medium">Targeted:</p>
                              <div className="space-y-1">
                                {activity.targeted_emails.slice(0, 3).map((email, emailIndex) => (
                                  <p key={emailIndex} className="truncate">{email}</p>
                                ))}
                                {activity.targeted_emails.length > 3 && (
                                  <p className="text-gray-500">+{activity.targeted_emails.length - 3} more</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Event Types */}
              {securityStats && securityStats.topEventTypes.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Top Event Types
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {securityStats.topEventTypes.map((eventType, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 truncate">
                            {eventType.event_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {eventType.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};