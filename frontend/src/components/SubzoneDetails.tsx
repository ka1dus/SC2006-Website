import React from 'react';
import { useQuery } from 'react-query';
import { subzoneService } from '@/services/api';
import { useMap } from '@/contexts/MapContext';
import { 
  MapPinIcon, 
  UsersIcon, 
  BuildingIcon, 
  BusIcon,
  TrainIcon,
  BarChart3Icon,
  DownloadIcon,
  PlusIcon
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface Subzone {
  id: string;
  subzoneId: string;
  name: string;
  region: string;
  score?: {
    H: number;
    percentile: number;
    zDemand: number;
    zSupply: number;
    zAccess: number;
  };
}

interface SubzoneDetailsProps {
  subzone: Subzone;
}

export default function SubzoneDetails({ subzone }: SubzoneDetailsProps) {
  const { addToComparison } = useMap();
  
  // Fetch detailed subzone information
  const { data: details, isLoading, error } = useQuery(
    ['subzone-details', subzone.subzoneId],
    () => subzoneService.getSubzoneDetails(subzone.subzoneId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const handleAddToComparison = () => {
    try {
      addToComparison(subzone);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export subzone details:', subzone.subzoneId);
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
            <span className="ml-2 text-sm text-gray-600">Loading details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">
              <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Failed to load details</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <MapPinIcon className="h-5 w-5 mr-2" />
            {subzone.name}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddToComparison}
              className="btn-outline text-sm px-3 py-1 flex items-center"
              title="Add to comparison"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Compare
            </button>
            <button
              onClick={handleExport}
              className="btn-outline text-sm px-3 py-1 flex items-center"
              title="Export details"
            >
              <DownloadIcon className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">{subzone.region}</p>
      </div>
      
      <div className="card-body space-y-6">
        {/* Score Overview */}
        {subzone.score && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <BarChart3Icon className="h-4 w-4 mr-2" />
              Hawker Opportunity Score
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {subzone.score.H.toFixed(3)}
                </div>
                <div className="text-xs text-blue-600">Overall Score</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {subzone.score.percentile.toFixed(1)}%
                </div>
                <div className="text-xs text-green-600">Percentile Rank</div>
              </div>
            </div>
            
            {/* Score Components */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Demand</span>
                <span className="font-medium">{subzone.score.zDemand.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Supply</span>
                <span className="font-medium">{subzone.score.zSupply.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Accessibility</span>
                <span className="font-medium">{subzone.score.zAccess.toFixed(3)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Demographics */}
        {details?.demographics && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <UsersIcon className="h-4 w-4 mr-2" />
              Demographics
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Population</span>
                <span className="font-medium">{details.demographics.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Age 0-14</span>
                <span className="font-medium">{details.demographics.ageGroups.age0_14.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Age 15-64</span>
                <span className="font-medium">{details.demographics.ageGroups.age15_64.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Age 65+</span>
                <span className="font-medium">{details.demographics.ageGroups.age65p.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Hawker Centres */}
        {details?.hawkerCentres && details.hawkerCentres.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <BuildingIcon className="h-4 w-4 mr-2" />
              Nearby Hawker Centres ({details.hawkerCentres.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {details.hawkerCentres.slice(0, 5).map((centre, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{centre.name}</span>
                  <span className="font-medium">{centre.distance}m</span>
                </div>
              ))}
              {details.hawkerCentres.length > 5 && (
                <p className="text-xs text-gray-500">
                  +{details.hawkerCentres.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* MRT Stations */}
        {details?.mrtStations && details.mrtStations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <TrainIcon className="h-4 w-4 mr-2" />
              Nearby MRT Stations ({details.mrtStations.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {details.mrtStations.slice(0, 5).map((station, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{station.name}</span>
                  <span className="font-medium">{station.distance}m</span>
                </div>
              ))}
              {details.mrtStations.length > 5 && (
                <p className="text-xs text-gray-500">
                  +{details.mrtStations.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bus Stops */}
        {details?.busStops && details.busStops.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <BusIcon className="h-4 w-4 mr-2" />
              Nearby Bus Stops ({details.busStops.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {details.busStops.slice(0, 5).map((stop, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{stop.code}</span>
                  <span className="font-medium">{stop.distance}m</span>
                </div>
              ))}
              {details.busStops.length > 5 && (
                <p className="text-xs text-gray-500">
                  +{details.busStops.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
