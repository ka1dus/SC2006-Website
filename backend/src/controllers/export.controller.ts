import { Request, Response } from 'express';
import { exportSchema } from '../schemas';
import { getSubzoneDetails } from '../services/subzone.service';
import { getLatestScores } from '../services/score.service';

// Export subzone details as PDF or PNG
export async function exportSubzoneDetails(req: Request, res: Response) {
  try {
    const validatedData = exportSchema.parse(req.body);
    
    // Get subzone details
    const details = await getSubzoneDetails(validatedData.subzoneId);
    
    if (!details) {
      return res.status(404).json({
        success: false,
        error: 'Subzone not found'
      });
    }

    // Get latest scores for context
    const scores = await getLatestScores([validatedData.subzoneId]);
    const subzoneScore = scores.find(s => s.subzoneId === validatedData.subzoneId);

    // Prepare export data
    const exportData = {
      subzone: {
        id: details.subzoneId,
        name: details.name,
        region: details.region,
        centroid: details.centroid
      },
      demographics: details.demographics,
      hawkerCentres: details.hawkerCentres,
      mrtStations: details.mrtStations,
      busStops: details.busStops,
      score: details.score,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: (req as any).user?.email || 'anonymous',
        format: validatedData.format,
        includeDetails: validatedData.includeDetails,
        includeLegend: validatedData.includeLegend
      }
    };

    if (validatedData.format === 'pdf') {
      // Generate PDF (simplified - in production, use a proper PDF library)
      const pdfContent = generatePDFContent(exportData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${details.name}-details.pdf"`);
      res.send(pdfContent);
      return;
      
    } else if (validatedData.format === 'png') {
      // Generate PNG (simplified - in production, use a proper image generation library)
      const pngContent = generatePNGContent(exportData);
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${details.name}-details.png"`);
      res.send(pngContent);
      return;
      
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format'
      });
      return;
    }

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Export failed'
    });
    return;
  }
}

// Export comparison data
export async function exportComparison(req: Request, res: Response) {
  try {
    const { subzoneIds, format = 'pdf' } = req.body;
    
    if (!subzoneIds || !Array.isArray(subzoneIds) || subzoneIds.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Exactly two subzone IDs are required for comparison'
      });
    }

    // Get details for both subzones
    const [details1, details2] = await Promise.all([
      getSubzoneDetails(subzoneIds[0]),
      getSubzoneDetails(subzoneIds[1])
    ]);

    if (!details1 || !details2) {
      return res.status(404).json({
        success: false,
        error: 'One or both subzones not found'
      });
    }

    // Get scores for comparison
    const scores = await getLatestScores(subzoneIds);
    const score1 = scores.find(s => s.subzoneId === subzoneIds[0]);
    const score2 = scores.find(s => s.subzoneId === subzoneIds[1]);

    // Prepare comparison data
    const comparisonData = {
      subzone1: {
        details: details1,
        score: score1
      },
      subzone2: {
        details: details2,
        score: score2
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: (req as any).user?.email || 'anonymous',
        format
      }
    };

    if (format === 'pdf') {
      const pdfContent = generateComparisonPDFContent(comparisonData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="comparison-${details1.name}-${details2.name}.pdf"`);
      res.send(pdfContent);
      return;
      
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format'
      });
      return;
    }

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Export failed'
    });
    return;
  }
}

// Helper function to generate PDF content (simplified)
function generatePDFContent(data: any): Buffer {
  // In a real implementation, use a library like puppeteer, jsPDF, or similar
  // This is a placeholder that returns a simple text representation
  
  const content = `
HAWKER OPPORTUNITY SCORE REPORT
================================

Subzone: ${data.subzone.name}
Region: ${data.subzone.region}
Exported: ${data.metadata.exportedAt}

DEMOGRAPHICS
${data.demographics ? `
Total Population: ${data.demographics.total}
Age 0-14: ${data.demographics.ageGroups.age0_14}
Age 15-64: ${data.demographics.ageGroups.age15_64}
Age 65+: ${data.demographics.ageGroups.age65p}
` : 'Demographics not available'}

HAWKER CENTRES
${data.hawkerCentres?.map((hc: any) => `- ${hc.name} (${hc.distance}m, capacity: ${hc.capacity})`).join('\n') || 'No hawker centres found'}

MRT STATIONS
${data.mrtStations?.map((station: any) => `- ${station.name} (${station.distance}m, ${station.lineCount} lines)`).join('\n') || 'No MRT stations found'}

BUS STOPS
${data.busStops?.map((stop: any) => `- ${stop.code} (${stop.distance}m)`).join('\n') || 'No bus stops found'}

SCORE ANALYSIS
${data.score ? `
Hawker Opportunity Score: ${data.score.H.toFixed(3)}
Percentile Rank: ${data.score.percentile.toFixed(1)}%
Demand Component: ${data.score.zDemand.toFixed(3)}
Supply Component: ${data.score.zSupply.toFixed(3)}
Accessibility Component: ${data.score.zAccess.toFixed(3)}
` : 'Score not available'}

Generated by Hawker Opportunity Score Platform
  `;

  return Buffer.from(content, 'utf-8');
}

// Helper function to generate PNG content (simplified)
function generatePNGContent(data: any): Buffer {
  // In a real implementation, use a library like canvas, sharp, or similar
  // This is a placeholder that returns a simple text representation
  
  const content = `
HAWKER OPPORTUNITY SCORE VISUALIZATION
=====================================

Subzone: ${data.subzone.name}
Score: ${data.score?.H.toFixed(3) || 'N/A'}
Percentile: ${data.score?.percentile.toFixed(1) || 'N/A'}%

Generated by Hawker Opportunity Score Platform
  `;

  return Buffer.from(content, 'utf-8');
}

// Helper function to generate comparison PDF content
function generateComparisonPDFContent(data: any): Buffer {
  const content = `
HAWKER OPPORTUNITY SCORE COMPARISON REPORT
=========================================

COMPARISON: ${data.subzone1.details.name} vs ${data.subzone2.details.name}
Exported: ${data.metadata.exportedAt}

${data.subzone1.details.name.toUpperCase()}
----------------------------------------
Score: ${data.subzone1.score?.H.toFixed(3) || 'N/A'}
Percentile: ${data.subzone1.score?.percentile.toFixed(1) || 'N/A'}%
Population: ${data.subzone1.details.demographics?.total || 'N/A'}
Hawker Centres: ${data.subzone1.details.hawkerCentres?.length || 0}
MRT Stations: ${data.subzone1.details.mrtStations?.length || 0}

${data.subzone2.details.name.toUpperCase()}
----------------------------------------
Score: ${data.subzone2.score?.H.toFixed(3) || 'N/A'}
Percentile: ${data.subzone2.score?.percentile.toFixed(1) || 'N/A'}%
Population: ${data.subzone2.details.demographics?.total || 'N/A'}
Hawker Centres: ${data.subzone2.details.hawkerCentres?.length || 0}
MRT Stations: ${data.subzone2.details.mrtStations?.length || 0}

Generated by Hawker Opportunity Score Platform
  `;

  return Buffer.from(content, 'utf-8');
}
