// /* eslint-disable no-console */
// import React, { useLayoutEffect, useRef } from 'react';

// import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
// import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
// import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
// import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
// import vtkCubeSource from '@kitware/vtk.js/Filters/Sources/CubeSource';
// import vtkAxesActor from '@kitware/vtk.js/Rendering/Core/AxesActor';
// import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';

// export default function VTKSmokeTestStronger() {
//   const ref = useRef(null);

//   useLayoutEffect(() => {
//     const el = ref.current;
//     if (!el) return;

//     const waitForSize = () =>
//       new Promise((resolve) => {
//         const tick = () => {
//           if (el.clientWidth > 0 && el.clientHeight > 0) resolve();
//           else requestAnimationFrame(tick);
//         };
//         tick();
//       });

//     let disposed = false;
//     let ro;

//     (async () => {
//       await waitForSize();
//       if (disposed) return;

//       Object.assign(el.style, { position: 'relative', background: '#111' });

//       const grw = vtkGenericRenderWindow.newInstance({ background: [0.1, 0.1, 0.1] });
//       grw.setContainer(el);
//       grw.resize();

//       const ren = grw.getRenderer();
//       const rw = grw.getRenderWindow();
//       const iren = grw.getInteractor();

//       // 1) SPHERE — bright cyan, lighting-independent + wireframe overlay
//       const sphere = vtkSphereSource.newInstance({ radius: 5, thetaResolution: 32, phiResolution: 32 });
//       const sMap = vtkMapper.newInstance();
//       sMap.setInputConnection(sphere.getOutputPort());
//       sMap.setScalarVisibility(false);
//       const sAct = vtkActor.newInstance();
//       sAct.setMapper(sMap);
//       const sp = sAct.getProperty();
//       sp.setAmbient(1.0); sp.setDiffuse(0.0); sp.setSpecular(0.0);
//       sp.setColor(0.2, 0.7, 1.0);
//       ren.addActor(sAct);

//       const sWire = vtkActor.newInstance();
//       sWire.setMapper(sMap);
//       sWire.getProperty().setRepresentationToWireframe();
//       sWire.getProperty().setAmbient(1.0);
//       sWire.getProperty().setColor(0, 0, 0);
//       ren.addActor(sWire);

//       // 2) CUBE — bright red, lighting-independent + wireframe overlay
//       const cube = vtkCubeSource.newInstance({ xLength: 8, yLength: 8, zLength: 8, center: [12, 0, 0] });
//       const cMap = vtkMapper.newInstance();
//       cMap.setInputConnection(cube.getOutputPort());
//       cMap.setScalarVisibility(false);
//       const cAct = vtkActor.newInstance();
//       cAct.setMapper(cMap);
//       const cp = cAct.getProperty();
//       cp.setAmbient(1.0); cp.setDiffuse(0.0); cp.setSpecular(0.0);
//       cp.setColor(1, 0.2, 0.2);
//       ren.addActor(cAct);

//       const cWire = vtkActor.newInstance();
//       cWire.setMapper(cMap);
//       cWire.getProperty().setRepresentationToWireframe();
//       cWire.getProperty().setAmbient(1.0);
//       cWire.getProperty().setColor(0, 0, 0);
//       ren.addActor(cWire);

//       console.log('[SMOKE+] sphere bounds:', sAct.getBounds());
//       console.log('[SMOKE+] cube   bounds:', cAct.getBounds());

//       // 3) Orientation marker
//       const axes = vtkAxesActor.newInstance();
//       const omw = vtkOrientationMarkerWidget.newInstance({ actor: axes, interactor: iren });
//       omw.setEnabled(true);
//       omw.setViewportCorner(vtkOrientationMarkerWidget.Corners.BOTTOM_LEFT);
//       omw.setViewportSize(0.16);

//       // 4) Camera — deterministic, huge clipping range
//       ren.resetCamera();
//       const cam = ren.getActiveCamera();
//       cam.setFocalPoint(0, 0, 0);
//       cam.setPosition(30, 30, 30);
//       cam.setViewUp(0, 0, 1);
//       cam.setClippingRange(0.01, 10000);
//       console.log('[SMOKE+] camera pos/fp/up:', cam.getPosition(), cam.getFocalPoint(), cam.getViewUp());

//       // 5) Draw a bunch of frames
//       let frames = 0;
//       const draw = () => {
//         if (disposed) return;
//         rw.render();
//         if (frames++ < 20) requestAnimationFrame(draw);
//       };
//       draw();

//       // 6) Keep responsive
//       ro = new ResizeObserver(() => { try { grw.resize(); rw.render(); } catch {} });
//       ro.observe(el);

//       // Expose for console poking
//       window._smoke2 = { grw, ren, rw, cam, sAct, cAct, el };
//       console.log('[SMOKE+] actors:', (ren.getViewProps?.() || []).length);
//     })();

//     return () => {
//       disposed = true;
//       try { ro?.disconnect(); } catch {}
//       try { window._smoke2?.grw?.delete(); } catch {}
//       delete window._smoke2;
//     };
//   }, []);

//   return (
//     <div style={{ display: 'grid', gap: 12 }}>
//       <div
//         ref={ref}
//         style={{
//           height: '70vh',
//           width: '100%',
//           borderRadius: 16,
//           overflow: 'hidden',
//           background: '#111',
//           position: 'relative',
//         }}
//       />
//     </div>
//   );
// }

import React, { useRef, useEffect, useState } from 'react';
 
// VTK Rendering Core
import '@kitware/vtk.js/Rendering/Profiles/Geometry'; 
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
 
// Interaction (Crucial for rotating the model)
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
 
// VTK Readers
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';
 
const VTKDropViewer = () => {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [instruction, setInstruction] = useState("Drag & Drop a .vtp or .stl file here");
 
  useEffect(() => {
    if (!vtkContainerRef.current) return;
 
    // 1. Setup the window
    const genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0.1, 0.1, 0.1],
    });
    genericRenderWindow.setContainer(vtkContainerRef.current);
    // 2. Setup Interactor (Mouse controls)
    const interactor = genericRenderWindow.getInteractor();
    interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());
 
    // 3. Resize and Render
    genericRenderWindow.resize();
    const handleResize = () => genericRenderWindow.resize();
    window.addEventListener('resize', handleResize);
 
    context.current = {
      genericRenderWindow,
      renderer: genericRenderWindow.getRenderer(),
      renderWindow: genericRenderWindow.getRenderWindow(),
      actors: [] 
    };
 
    return () => {
      window.removeEventListener('resize', handleResize);
      if (context.current) {
        context.current.genericRenderWindow.delete();
      }
    };
  }, []);
 
  const processFile = (file) => {
    console.log("1. File dropped:", file.name);
    setError(null);
    setLoading(true);
    setInstruction("Processing...");
 
    const readerFn = new FileReader();
    const extension = file.name.split('.').pop().toLowerCase();
 
    readerFn.onload = function onLoad(e) {
      console.log("2. File read into memory");
      const arrayBuffer = e.target.result;
      let vtkReader = null;
 
      try {
        // Select Reader
        if (extension === 'vtp') {
          vtkReader = vtkXMLPolyDataReader.newInstance();
        } else if (extension === 'stl') {
          vtkReader = vtkSTLReader.newInstance();
        } else {
          throw new Error(`Unsupported file format: .${extension}`);
        }
 
        // Parse Data
        vtkReader.parseAsArrayBuffer(arrayBuffer);
        console.log("3. VTK Reader parsed data");
 
        // Validate Data
        const outputData = vtkReader.getOutputData(0);
        if (!outputData || outputData.getNumberOfPoints() === 0) {
          throw new Error("File parsed successfully, but contains 0 points (Empty Geometry).");
        }
        console.log(`4. Geometry valid. Points: ${outputData.getNumberOfPoints()}`);
 
        // Update Scene
        updateScene(vtkReader);
        setInstruction(""); 
      } catch (err) {
        console.error("VTK Error:", err);
        setError(err.message);
        setInstruction("Error loading file.");
      } finally {
        setLoading(false);
      }
    };
 
    readerFn.readAsArrayBuffer(file);
  };
 
  const updateScene = (reader) => {
    const { renderer, renderWindow, actors } = context.current;
 
    // Clear previous actors
    actors.forEach(actor => renderer.removeActor(actor));
    context.current.actors = [];
 
    // Pipeline: Reader -> Mapper -> Actor
    const mapper = vtkMapper.newInstance();
    const actor = vtkActor.newInstance();
 
    mapper.setInputConnection(reader.getOutputPort());
    actor.setMapper(mapper);
 
    renderer.addActor(actor);
    context.current.actors.push(actor);
 
    // Center Camera on the new object
    console.log("5. Resetting Camera");
    renderer.resetCamera();
    // Force a render
    renderWindow.render(); 
    console.log("6. Render complete");
  };
 
  // --- Drag & Drop Handlers ---
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
 
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };
 
  // --- Styles ---
  const containerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  };
 
  const overlayStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'white',
    pointerEvents: 'none',
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
    zIndex: 10,
  };
 
  return (
<div style={containerStyle} onDragOver={handleDragOver} onDrop={handleDrop}>
<div ref={vtkContainerRef} style={{ width: '100%', height: '100%' }} />
      {(instruction || error) && (
<div style={overlayStyle}>
          {loading && <h3>Processing...</h3>}
          {!loading && <h3>{error ? `Error: ${error}` : instruction}</h3>}
          {error && <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Use valid .vtp or .stl files</p>}
</div>
      )}
</div>
  );
};
 
export default VTKDropViewer;