import React, { useEffect, useState } from 'react';

/**
 * Khoi 6 — Trang dieu khoan san (CHUA NOI VAO App.tsx).
 * Dieu phoi vien noi route khi gop: vi du them nut "Điều khoản sàn"
 * o khu vuc san va render <MarketplaceTermsPage />.
 * Noi dung lay truc tiep tu GET /api/marketplace/terms nen khong bi
 * lech voi ban API phuc vu; ban hien thi nay khong phai ban phap ly
 * cuoi cung (xem muc needsReview do API tra ve).
 */

interface TermsSection {
  title: string;
  body: string[];
}

interface TermsData {
  version: string;
  title: string;
  note: string;
  sections: TermsSection[];
  needsReview: string[];
}

export const MarketplaceTermsPage: React.FC = () => {
  const [terms, setTerms] = useState<TermsData | null>(null);
  const [error, setError] = useState('');
  const [acceptMessage, setAcceptMessage] = useState('');

  useEffect(() => {
    fetch('/api/marketplace/terms')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.success && d.terms) setTerms(d.terms);
        else setError('Không tải được điều khoản sàn, vui lòng thử lại sau.');
      })
      .catch(() => setError('Không tải được điều khoản sàn, vui lòng thử lại sau.'));
  }, []);

  const acceptTerms = async () => {
    setAcceptMessage('');
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/marketplace/compliance/terms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setAcceptMessage(data && data.success ? data.message : data.message || 'Chấp nhận thất bại, vui lòng thử lại.');
    } catch {
      setAcceptMessage('Chấp nhận thất bại, vui lòng thử lại.');
    }
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!terms) return <div className="p-6">Đang tải điều khoản sàn…</div>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">{terms.title}</h1>
      <p className="mt-2 text-sm text-gray-600">Phiên bản: {terms.version}</p>
      <p className="mt-2">{terms.note}</p>
      {terms.sections.map((section) => (
        <section key={section.title} className="mt-6">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.body.map((paragraph, idx) => (
            <p key={idx} className="mt-2 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <section className="mt-8 rounded border border-amber-300 bg-amber-50 p-4">
        <h2 className="font-semibold">Phần cần duyệt trước khi coi là điều khoản cuối cùng</h2>
        <ul className="mt-2 list-disc pl-5">
          {terms.needsReview.map((item) => (
            <li key={item} className="mt-1">
              {item}
            </li>
          ))}
        </ul>
      </section>
      <button
        type="button"
        onClick={acceptTerms}
        className="mt-6 rounded bg-orange-600 px-5 py-2 font-semibold text-white"
      >
        Tôi đã đọc và chấp nhận điều khoản sàn
      </button>
      {acceptMessage && <p className="mt-3">{acceptMessage}</p>}
    </div>
  );
};
