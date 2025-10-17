/* eslint-disable no-console */
import React, { useLayoutEffect, useRef } from 'react';

import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
import vtkCubeSource from '@kitware/vtk.js/Filters/Sources/CubeSource';
import vtkAxesActor from '@kitware/vtk.js/Rendering/Core/AxesActor';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';

export default function VTKSmokeTestStronger() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const waitForSize = () =>
      new Promise((resolve) => {
        const tick = () => {
          if (el.clientWidth > 0 && el.clientHeight > 0) resolve();
          else requestAnimationFrame(tick);
        };
        tick();
      });

    let disposed = false;
    let ro;

    (async () => {
      await waitForSize();
      if (disposed) return;

      Object.assign(el.style, { position: 'relative', background: '#111' });

      const grw = vtkGenericRenderWindow.newInstance({ background: [0.1, 0.1, 0.1] });
      grw.setContainer(el);
      grw.resize();

      const ren = grw.getRenderer();
      const rw = grw.getRenderWindow();
      const iren = grw.getInteractor();

      // 1) SPHERE — bright cyan, lighting-independent + wireframe overlay
      const sphere = vtkSphereSource.newInstance({ radius: 5, thetaResolution: 32, phiResolution: 32 });
      const sMap = vtkMapper.newInstance();
      sMap.setInputConnection(sphere.getOutputPort());
      sMap.setScalarVisibility(false);
      const sAct = vtkActor.newInstance();
      sAct.setMapper(sMap);
      const sp = sAct.getProperty();
      sp.setAmbient(1.0); sp.setDiffuse(0.0); sp.setSpecular(0.0);
      sp.setColor(0.2, 0.7, 1.0);
      ren.addActor(sAct);

      const sWire = vtkActor.newInstance();
      sWire.setMapper(sMap);
      sWire.getProperty().setRepresentationToWireframe();
      sWire.getProperty().setAmbient(1.0);
      sWire.getProperty().setColor(0, 0, 0);
      ren.addActor(sWire);

      // 2) CUBE — bright red, lighting-independent + wireframe overlay
      const cube = vtkCubeSource.newInstance({ xLength: 8, yLength: 8, zLength: 8, center: [12, 0, 0] });
      const cMap = vtkMapper.newInstance();
      cMap.setInputConnection(cube.getOutputPort());
      cMap.setScalarVisibility(false);
      const cAct = vtkActor.newInstance();
      cAct.setMapper(cMap);
      const cp = cAct.getProperty();
      cp.setAmbient(1.0); cp.setDiffuse(0.0); cp.setSpecular(0.0);
      cp.setColor(1, 0.2, 0.2);
      ren.addActor(cAct);

      const cWire = vtkActor.newInstance();
      cWire.setMapper(cMap);
      cWire.getProperty().setRepresentationToWireframe();
      cWire.getProperty().setAmbient(1.0);
      cWire.getProperty().setColor(0, 0, 0);
      ren.addActor(cWire);

      console.log('[SMOKE+] sphere bounds:', sAct.getBounds());
      console.log('[SMOKE+] cube   bounds:', cAct.getBounds());

      // 3) Orientation marker
      const axes = vtkAxesActor.newInstance();
      const omw = vtkOrientationMarkerWidget.newInstance({ actor: axes, interactor: iren });
      omw.setEnabled(true);
      omw.setViewportCorner(vtkOrientationMarkerWidget.Corners.BOTTOM_LEFT);
      omw.setViewportSize(0.16);

      // 4) Camera — deterministic, huge clipping range
      ren.resetCamera();
      const cam = ren.getActiveCamera();
      cam.setFocalPoint(0, 0, 0);
      cam.setPosition(30, 30, 30);
      cam.setViewUp(0, 0, 1);
      cam.setClippingRange(0.01, 10000);
      console.log('[SMOKE+] camera pos/fp/up:', cam.getPosition(), cam.getFocalPoint(), cam.getViewUp());

      // 5) Draw a bunch of frames
      let frames = 0;
      const draw = () => {
        if (disposed) return;
        rw.render();
        if (frames++ < 20) requestAnimationFrame(draw);
      };
      draw();

      // 6) Keep responsive
      ro = new ResizeObserver(() => { try { grw.resize(); rw.render(); } catch {} });
      ro.observe(el);

      // Expose for console poking
      window._smoke2 = { grw, ren, rw, cam, sAct, cAct, el };
      console.log('[SMOKE+] actors:', (ren.getViewProps?.() || []).length);
    })();

    return () => {
      disposed = true;
      try { ro?.disconnect(); } catch {}
      try { window._smoke2?.grw?.delete(); } catch {}
      delete window._smoke2;
    };
  }, []);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        ref={ref}
        style={{
          height: '70vh',
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          background: '#111',
          position: 'relative',
        }}
      />
    </div>
  );
}
