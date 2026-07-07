import { useEffect, useState } from 'react';
import { api } from '../../../shared/api';

export default function Customers() {
  const [list, setList] = useState([]);
  useEffect(() => {
    api('/admin/customers').then(setList);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">مشتریان</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">نام</th>
              <th className="p-3 text-right">موبایل</th>
              <th className="p-3 text-right">ایمیل</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3">{c.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
