import * as React from 'react';
const PlusCircle = (props) => (
  <svg width={16} height={16} viewBox="0 0 16 16" {...props}>
    <circle cx={8} cy={8} r={7} fill="#64b5f6" stroke="#1565c0" strokeWidth={1} />
    <path d="M8 4v8M4 8h8" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);
export default PlusCircle;