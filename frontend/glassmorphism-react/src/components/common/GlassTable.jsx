import React from 'react';

export const GlassTable = ({
  headers = [],
  data = [],
  renderRow,
  className = '',
}) => {
  return (
    <div className={`w-full overflow-hidden rounded-3xl border border-white/10 backdrop-blur-xl bg-slate-900/40 shadow-xl ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.04]">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="py-3.5 px-5 font-semibold text-xs text-slate-300 uppercase tracking-wider select-none"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {data.map((item, index) => (
              <tr
                key={index}
                className="hover:bg-white/[0.07] transition-colors duration-150 group"
              >
                {renderRow ? (
                  renderRow(item, index)
                ) : (
                  <td colSpan={headers.length} className="p-4">
                    {JSON.stringify(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlassTable;
