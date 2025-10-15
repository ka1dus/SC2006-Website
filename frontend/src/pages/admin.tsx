import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  RefreshCwIcon, 
  DatabaseIcon, 
  BarChart3Icon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch system statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    'admin-stats',
    adminService.getSystemStats,
    {
      enabled: isAdmin,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch snapshots
  const { data: snapshots, isLoading: snapshotsLoading } = useQuery(
    'admin-snapshots',
    adminService.getAllSnapshots,
    {
      enabled: isAdmin,
    }
  );

  // Refresh datasets mutation
  const refreshMutation = useMutation(adminService.refreshDatasets, {
    onSuccess: () => {
      toast.success('Datasets refreshed successfully!');
      queryClient.invalidateQueries('admin-stats');
      queryClient.invalidateQueries('admin-snapshots');
      queryClient.invalidateQueries('subzones');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to refresh datasets');
    },
    onSettled: () => {
      setIsRefreshing(false);
    },
  });

  const handleRefreshDatasets = () => {
    setIsRefreshing(true);
    refreshMutation.mutate({ force: true });
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertCircleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">
              You need admin privileges to access this page.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage datasets, snapshots, and system configuration
          </p>
        </div>

        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DatabaseIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Subzones</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? <LoadingSpinner size="sm" /> : stats?.statistics.subzones || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3Icon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Scores</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? <LoadingSpinner size="sm" /> : stats?.statistics.scores || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? <LoadingSpinner size="sm" /> : stats?.statistics.users || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Snapshots</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? <LoadingSpinner size="sm" /> : stats?.statistics.snapshots || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dataset Management */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Dataset Management</h3>
            </div>
            <div className="card-body">
              <p className="text-sm text-gray-600 mb-4">
                Refresh datasets from official sources and recompute scores.
              </p>
              
              <button
                onClick={handleRefreshDatasets}
                disabled={isRefreshing}
                className="btn-primary w-full flex items-center justify-center"
              >
                {isRefreshing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Refreshing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                    Refresh Datasets
                  </>
                )}
              </button>
              
              {stats?.latestSnapshot && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Latest Snapshot</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Created: {new Date(stats.latestSnapshot.createdAt).toLocaleString()}</p>
                    <p>Scores: {stats.latestSnapshot._count.scores}</p>
                    {stats.latestSnapshot.notes && (
                      <p>Notes: {stats.latestSnapshot.notes}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Snapshots */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Recent Snapshots</h3>
            </div>
            <div className="card-body">
              {snapshotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : snapshots && snapshots.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {snapshots.slice(0, 5).map((snapshot: any) => (
                    <div key={snapshot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(snapshot.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {snapshot.notes || 'No notes'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-gray-500">
                          {snapshot.scores?.length || 0} scores
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No snapshots available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
