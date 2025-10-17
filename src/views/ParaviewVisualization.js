import React from 'react';
import VTKDropViewer from '../components/VTKDropViewer';

export default function ParaviewVisualization() {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>3D / Volume Viewer</h2>
      <VTKDropViewer />
    </div>
  );
}
