import Papa from 'papaparse';
import { Sample } from '@workspace/api-client-react';
import { format } from 'date-fns';

export function exportSamplesToCSV(samples: Sample[], filename: string = 'geofield-export') {
  if (!samples || samples.length === 0) return;

  // Flatten sample object for CSV
  const flattenedData = samples.map(sample => {
    const baseData = {
      'Database ID': sample.id,
      'Sample Type': sample.sampleType,
      'Sample ID': sample.sampleId,
      'Folder ID': sample.folderId || 'Uncategorized',
      'Notes': sample.notes || '',
      'Created At': format(new Date(sample.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    };
    
    // Merge fields carefully to avoid object object in CSV
    const fieldsData: Record<string, string> = {};
    if (sample.fields && typeof sample.fields === 'object') {
      Object.entries(sample.fields).forEach(([key, value]) => {
        fieldsData[`Field: ${key}`] = value ? String(value) : '';
      });
    }

    return { ...baseData, ...fieldsData };
  });

  const csv = Papa.unparse(flattenedData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
