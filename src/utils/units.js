export function inferUnit(measurement) {
  const m = (measurement || '').toLowerCase();
  if (m.includes('power')) return 'kW';
  if (m.includes('energy') || m.includes('consumption')) return 'kWh';
  if (m.includes('co2') || m.includes('emission')) return 'kgCO₂e';
  if (m.includes('temperature')) return '°C';
  if (m.includes('humidity')) return '%';
  return '';
}