import React, { useState, useEffect, useRef } from 'react';

const NumericalMethodsVisualizer = () => {
  const [funcStr, setFuncStr] = useState('x**2 - 4');
  const [method, setMethod] = useState('regula_falsi');
  const [a, setA] = useState(0);
  const [b, setB] = useState(5);
  const [x0, setX0] = useState(1);
  const [epsilon, setEpsilon] = useState(0.0001);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Parse function string safely
  const parseFunction = (str) => {
    try {
      let processed = str.replace(/\*\*/g, '^');
      processed = processed.replace(/\^/g, '**');
      
      const func = new Function('x', `
        const Math_sqrt = Math.sqrt;
        const Math_sin = Math.sin;
        const Math_cos = Math.cos;
        const Math_tan = Math.tan;
        const Math_exp = Math.exp;
        const Math_log = Math.log;
        const Math_abs = Math.abs;
        return ${processed};
      `);
      
      func(1);
      return func;
    } catch (e) {
      throw new Error('Invalid function syntax');
    }
  };

  // Numerical derivative
  const numericalDerivative = (func, x, h = 0.0001) => {
    return (func(x + h) - func(x - h)) / (2 * h);
  };

  // Regula Falsi Method
  const regulaFalsi = (func, a, b, eps, maxIter = 50) => {
    const steps = [];
    let f1 = func(a);
    let f2 = func(b);
    
    if (f1 * f2 > 0) {
      throw new Error('Root must be bracketed (f(a) and f(b) must have opposite signs)');
    }
    
    steps.push({ a, b, c: null, type: 'initial' });
    
    for (let i = 0; i < maxIter; i++) {
      const c = (a * f2 - b * f1) / (f2 - f1);
      const f3 = func(c);
      
      steps.push({ a, b, c, fc: f3, type: 'iteration' });
      
      if (Math.abs(f3) < eps) {
        steps.push({ a, b, c, type: 'converged' });
        return { steps, root: c };
      }
      
      if (f1 * f3 < 0) {
        b = c;
        f2 = f3;
      } else {
        a = c;
        f1 = f3;
      }
    }
    
    return { steps, root: null, message: 'Max iterations reached' };
  };

  // Ridders Method
  const ridders = (func, a, b, eps, maxIter = 50) => {
    const steps = [];
    let f1 = func(a);
    let f2 = func(b);
    
    if (f1 * f2 > 0) {
      throw new Error('Root must be bracketed (f(a) and f(b) must have opposite signs)');
    }
    
    steps.push({ a, b, c: null, d: null, type: 'initial' });
    
    for (let i = 0; i < maxIter; i++) {
      const c = 0.5 * (a + b);
      const f3 = func(c);
      
      if (Math.abs(f3) <= eps) {
        steps.push({ a, b, c, d: c, type: 'converged' });
        return { steps, root: c };
      }
      
      const s = Math.sqrt(f3 * f3 - f1 * f2);
      if (s === 0) return { steps, root: c };
      
      const d = c + (c - a) * ((f1 >= f2 ? 1 : -1) * f3 / s);
      const f4 = func(d);
      
      steps.push({ a, b, c, d, fc: f3, fd: f4, type: 'iteration' });
      
      if (Math.abs(f4) <= eps) {
        steps.push({ a, b, c, d, type: 'converged' });
        return { steps, root: d };
      }
      
      if (f3 * f4 < 0) {
        a = c;
        f1 = f3;
        b = d;
        f2 = f4;
      } else if (f1 * f4 < 0) {
        b = d;
        f2 = f4;
      } else {
        a = d;
        f1 = f4;
      }
    }
    
    return { steps, root: null, message: 'Max iterations reached' };
  };

  // Newton-Raphson Method
  const newtonRaphson = (func, x0, eps, maxIter = 50) => {
    const steps = [];
    let x = x0;
    
    steps.push({ x, fx: func(x), type: 'initial' });
    
    for (let i = 0; i < maxIter; i++) {
      const fx = func(x);
      const dfx = numericalDerivative(func, x);
      
      if (Math.abs(fx) <= eps) {
        steps.push({ x, fx, type: 'converged' });
        return { steps, root: x };
      }
      
      if (Math.abs(dfx) < 1e-10) {
        throw new Error('Derivative too close to zero');
      }
      
      const x_new = x - fx / dfx;
      steps.push({ x, x_new, fx, dfx, type: 'iteration' });
      x = x_new;
    }
    
    return { steps, root: null, message: 'Max iterations reached' };
  };

  // Run the selected method
  const runMethod = () => {
    try {
      setError('');
      const func = parseFunction(funcStr);
      
      let methodResult;
      if (method === 'regula_falsi') {
        methodResult = regulaFalsi(func, parseFloat(a), parseFloat(b), epsilon);
      } else if (method === 'ridders') {
        methodResult = ridders(func, parseFloat(a), parseFloat(b), epsilon);
      } else {
        methodResult = newtonRaphson(func, parseFloat(x0), epsilon);
      }
      
      setSteps(methodResult.steps);
      setResult(methodResult);
      setCurrentFrame(0);
      setIsAnimating(true);
    } catch (e) {
      setError(e.message);
      setSteps([]);
      setResult(null);
    }
  };

  // Animation loop
  useEffect(() => {
    if (isAnimating && steps.length > 0) {
      animationRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= steps.length - 1) {
            setIsAnimating(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isAnimating, steps]);

  // Draw on canvas
  useEffect(() => {
    if (!canvasRef.current || steps.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    try {
      const func = parseFunction(funcStr);
      const step = steps[currentFrame];
      
      // Determine plot range
      let xMin, xMax;
      if (method === 'newton_raphson') {
        xMin = Math.min(x0 - 2, step.x - 2);
        xMax = Math.max(x0 + 2, step.x + 2);
      } else {
        xMin = a - 1;
        xMax = b + 1;
      }
      
      // Calculate y range
      const numPoints = 500;
      const xValues = [];
      const yValues = [];
      for (let i = 0; i < numPoints; i++) {
        const x = xMin + (xMax - xMin) * i / (numPoints - 1);
        try {
          const y = func(x);
          if (isFinite(y)) {
            xValues.push(x);
            yValues.push(y);
          }
        } catch (e) {}
      }
      
      if (yValues.length === 0) return;
      
      const yMin = Math.min(...yValues, -1);
      const yMax = Math.max(...yValues, 1);
      const yRange = yMax - yMin;
      const yPadding = yRange * 0.1;
      
      const toCanvasX = (x) => ((x - xMin) / (xMax - xMin)) * (width - 80) + 40;
      const toCanvasY = (y) => height - 40 - ((y - (yMin - yPadding)) / (yRange + 2 * yPadding)) * (height - 80);
      
      // Draw axes
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const zeroY = toCanvasY(0);
      if (zeroY >= 40 && zeroY <= height - 40) {
        ctx.moveTo(40, zeroY);
        ctx.lineTo(width - 40, zeroY);
      }
      ctx.stroke();
      
      // Draw function
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < xValues.length; i++) {
        const x = toCanvasX(xValues[i]);
        const y = toCanvasY(yValues[i]);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // Draw method-specific elements
      if (method === 'regula_falsi' || method === 'ridders') {
        if (step.a !== null) {
          const x = toCanvasX(step.a);
          const y = toCanvasY(func(step.a));
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
        }
        if (step.b !== null) {
          const x = toCanvasX(step.b);
          const y = toCanvasY(func(step.b));
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
        }
        if (step.c !== null) {
          const x = toCanvasX(step.c);
          const y = toCanvasY(func(step.c));
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
        }
        if (method === 'ridders' && step.d !== null) {
          const x = toCanvasX(step.d);
          const y = toCanvasY(func(step.d));
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          ctx.fill();
        }
      } else if (method === 'newton_raphson') {
        if (step.x !== null) {
          const x = toCanvasX(step.x);
          const y = toCanvasY(func(step.x));
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw tangent line
          if (step.dfx !== undefined) {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            const x1 = step.x - 2;
            const x2 = step.x + 2;
            const y1 = func(step.x) + step.dfx * (x1 - step.x);
            const y2 = func(step.x) + step.dfx * (x2 - step.x);
            ctx.moveTo(toCanvasX(x1), toCanvasY(y1));
            ctx.lineTo(toCanvasX(x2), toCanvasY(y2));
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          if (step.x_new !== undefined) {
            const x = toCanvasX(step.x_new);
            const y = toCanvasY(0);
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
      
      // Draw convergence marker
      if (step.type === 'converged') {
        let rootX;
        if (method === 'newton_raphson') {
          rootX = step.x;
        } else if (method === 'ridders' && step.d !== null) {
          rootX = step.d;
        } else if (step.c !== null) {
          rootX = step.c;
        }
        
        if (rootX !== undefined) {
          const x = toCanvasX(rootX);
          const y = toCanvasY(0);
          ctx.fillStyle = '#22c55e';
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      }
      
    } catch (e) {
      console.error('Drawing error:', e);
    }
  }, [steps, currentFrame, funcStr, method, a, b, x0]);

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)',
      padding: '32px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    maxWidth: {
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    title: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '8px'
    },
    subtitle: {
      color: '#6b7280',
      fontSize: '16px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '24px'
    },
    gridLarge: {
      display: 'grid',
      gridTemplateColumns: '400px 1fr',
      gap: '24px'
    },
    card: {
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      padding: '24px'
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '16px',
      color: '#1f2937'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      outline: 'none'
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      outline: 'none',
      backgroundColor: 'white'
    },
    inputHint: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    },
    inputRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px'
    },
    button: {
      width: '100%',
      backgroundColor: '#2563eb',
      color: 'white',
      fontWeight: '600',
      padding: '12px 16px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'background-color 0.2s'
    },
    errorBox: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      padding: '12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      marginTop: '16px'
    },
    errorText: {
      fontSize: '14px',
      color: '#991b1b'
    },
    successBox: {
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '6px',
      padding: '12px',
      marginTop: '16px'
    },
    successText: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#166534'
    },
    infoBox: {
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '6px',
      padding: '16px',
      marginTop: '24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px'
    },
    infoText: {
      fontSize: '12px',
      color: '#1e40af'
    },
    infoTitle: {
      fontWeight: '600',
      marginBottom: '4px'
    },
    canvas: {
      width: '100%',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      display: 'block'
    },
    iterationBox: {
      backgroundColor: '#f9fafb',
      borderRadius: '6px',
      padding: '16px',
      fontFamily: 'monospace',
      fontSize: '14px'
    },
    iterationLine: {
      marginBottom: '4px'
    },
    convergedText: {
      color: '#22c55e',
      fontWeight: 'bold',
      marginTop: '8px'
    },
    slider: {
      width: '100%',
      marginTop: '16px'
    },
    rightColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <div style={styles.header}>
          <h1 style={styles.title}>Numerical Methods Visualizer</h1>
          <p style={styles.subtitle}>Visualize root-finding algorithms in action</p>
        </div>

        <div style={window.innerWidth > 1024 ? styles.gridLarge : styles.grid}>
          {/* Controls */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Settings</h2>
            
            <div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Function f(x)</label>
                <input
                  type="text"
                  value={funcStr}
                  onChange={(e) => setFuncStr(e.target.value)}
                  style={styles.input}
                  placeholder="x**2 - 4"
                />
                <p style={styles.inputHint}>
                  Use: +, -, *, /, **, Math.sin, Math.cos, Math.sqrt, etc.
                </p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  style={styles.select}
                >
                  <option value="regula_falsi">Regula Falsi (False Position)</option>
                  <option value="ridders">Ridders Method</option>
                  <option value="newton_raphson">Newton-Raphson</option>
                </select>
              </div>

              {method !== 'newton_raphson' ? (
                <div style={styles.inputRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>a (left bracket)</label>
                    <input
                      type="number"
                      value={a}
                      onChange={(e) => setA(e.target.value)}
                      style={styles.input}
                      step="0.1"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>b (right bracket)</label>
                    <input
                      type="number"
                      value={b}
                      onChange={(e) => setB(e.target.value)}
                      style={styles.input}
                      step="0.1"
                    />
                  </div>
                </div>
              ) : (
                <div style={styles.formGroup}>
                  <label style={styles.label}>x₀ (initial guess)</label>
                  <input
                    type="number"
                    value={x0}
                    onChange={(e) => setX0(e.target.value)}
                    style={styles.input}
                    step="0.1"
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Tolerance (ε)</label>
                <input
                  type="number"
                  value={epsilon}
                  onChange={(e) => setEpsilon(parseFloat(e.target.value))}
                  style={styles.input}
                  step="0.0001"
                  min="0.00001"
                />
              </div>

              <button
                onClick={runMethod}
                style={styles.button}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                <span>▶</span>
                Run Animation
              </button>

              {error && (
                <div style={styles.errorBox}>
                  <span style={{color: '#dc2626', fontSize: '18px'}}>⚠</span>
                  <p style={styles.errorText}>{error}</p>
                </div>
              )}

              {result && result.root !== null && (
                <div style={styles.successBox}>
                  <p style={styles.successText}>
                    Root found: {result.root.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            {/* Info box */}
            <div style={styles.infoBox}>
              <span style={{color: '#3b82f6', fontSize: '18px'}}>ℹ</span>
              <div style={styles.infoText}>
                <p style={styles.infoTitle}>Method Info:</p>
                {method === 'regula_falsi' && (
                  <p>Uses linear interpolation between two points that bracket the root.</p>
                )}
                {method === 'ridders' && (
                  <p>Combines bisection with exponential interpolation for faster convergence.</p>
                )}
                {method === 'newton_raphson' && (
                  <p>Uses the tangent line to find the next approximation. Converges quickly but needs a good initial guess.</p>
                )}
              </div>
            </div>
          </div>

          {/* Visualization */}
          <div style={styles.rightColumn}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Visualization</h2>
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                style={styles.canvas}
              />
            </div>

            {/* Iteration info */}
            {steps.length > 0 && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  Iteration {currentFrame} / {steps.length - 1}
                </h2>
                <div style={styles.iterationBox}>
                  {(() => {
                    const step = steps[currentFrame];
                    const func = parseFunction(funcStr);
                    
                    return (
                      <div>
                        {step.a !== undefined && step.a !== null && (
                          <>
                            <p style={styles.iterationLine}>a = {step.a.toFixed(6)}</p>
                            <p style={styles.iterationLine}>f(a) = {func(step.a).toFixed(6)}</p>
                          </>
                        )}
                        {step.b !== undefined && step.b !== null && (
                          <>
                            <p style={styles.iterationLine}>b = {step.b.toFixed(6)}</p>
                            <p style={styles.iterationLine}>f(b) = {func(step.b).toFixed(6)}</p>
                          </>
                        )}
                        {step.c !== undefined && step.c !== null && (
                          <>
                            <p style={styles.iterationLine}>c = {step.c.toFixed(6)}</p>
                            <p style={styles.iterationLine}>f(c) = {(step.fc !== undefined ? step.fc : func(step.c)).toFixed(6)}</p>
                          </>
                        )}
                        {step.d !== undefined && step.d !== null && (
                          <>
                            <p style={styles.iterationLine}>d = {step.d.toFixed(6)}</p>
                            <p style={styles.iterationLine}>f(d) = {(step.fd !== undefined ? step.fd : func(step.d)).toFixed(6)}</p>
                          </>
                        )}
                        {step.x !== undefined && step.x !== null && (
                          <>
                            <p style={styles.iterationLine}>x = {step.x.toFixed(6)}</p>
                            <p style={styles.iterationLine}>f(x) = {step.fx.toFixed(6)}</p>
                          </>
                        )}
                        {step.dfx !== undefined && (
                          <p style={styles.iterationLine}>f'(x) = {step.dfx.toFixed(6)}</p>
                        )}
                        {step.x_new !== undefined && (
                          <>
                            <p style={styles.iterationLine}>x_new = {step.x_new.toFixed(6)}</p>
                            <p style={styles.iterationLine}>Δx = {(step.x_new - step.x).toFixed(6)}</p>
                          </>
                        )}
                        {step.type === 'converged' && (
                          <p style={styles.convergedText}>✓ CONVERGED!</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {steps.length > 1 && (
                  <input
                    type="range"
                    min="0"
                    max={steps.length - 1}
                    value={currentFrame}
                    onChange={(e) => {
                      setCurrentFrame(parseInt(e.target.value));
                      setIsAnimating(false);
                    }}
                    style={styles.slider}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumericalMethodsVisualizer;