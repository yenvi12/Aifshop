"use client";

import { motion } from "framer-motion";

interface SpecificationsTableProps {
  specifications?: Record<string, string>;
  className?: string;
}

export default function SpecificationsTable({
  specifications,
  className = "",
}: SpecificationsTableProps) {
  if (!specifications || Object.keys(specifications).length === 0) {
    return null;
  }

  const entries = Object.entries(specifications);

  return (
    <section className={`space-y-6 ${className}`}>
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-6">
        Thông số kỹ thuật
      </h2>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-brand-light">
              <th className="px-6 py-4 text-left text-base font-semibold text-brand-dark w-2/5">
                Thông số
              </th>
              <th className="px-6 py-4 text-left text-base font-semibold text-brand-dark">
                Giá trị
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([label, value], index) => (
              <motion.tr
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`
                  border-b border-gray-200 last:border-b-0
                  transition-colors duration-200
                  hover:bg-brand-soft
                  ${index % 2 === 0 ? "bg-white" : "bg-brand-soft/50"}
                `}
              >
                <td className="px-6 py-4 text-base font-semibold text-gray-700">
                  {label}
                </td>
                <td className="px-6 py-4 text-base text-gray-600">{value}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {entries.map(([label, value], index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
          >
            <div className="text-sm font-semibold text-gray-700 mb-2">
              {label}
            </div>
            <div className="text-base text-gray-600">{value}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

