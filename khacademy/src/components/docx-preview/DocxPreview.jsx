import React, { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { X, Download, FileText, Loader2, Printer } from "lucide-react";
import { apiClient } from "@utils/reaxios";
import "./DocxPreview.css";

export default function DocxPreview({ attachNo, fileName, onClose }) {
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attachNo) return;

    let isMounted = true;

    const loadDocxFile = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.get(`/attach/${attachNo}`, {
          responseType: "arraybuffer",
        });

        if (!isMounted) return;

        if (viewerRef.current) {
          viewerRef.current.innerHTML = "";
          await renderAsync(res.data, viewerRef.current, null, {
            className: "docx-office-page",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
          });
        }
      } catch (err) {
        console.error("워드 파일 렌더링 에러:", err);
        if (isMounted) {
          setError("문서 서식을 불러오는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDocxFile();

    return () => {
      isMounted = false;
    };
  }, [attachNo]);

  const handleDownload = async () => {
    try {
      const res = await apiClient.get(`/attach/${attachNo}`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", fileName || `document_${attachNo}.docx`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("다운로드 실패:", e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="office-docx-overlay" onClick={onClose}>
      <div className="office-docx-window" onClick={(e) => e.stopPropagation()}>
        {/* 오피스 스타일 탑 툴바 */}
        <div className="office-docx-nav">
          <div className="office-nav-left">
            <div className="office-doc-icon">
              <FileText size={18} />
            </div>
            <div className="office-doc-info">
              <span className="office-doc-title">{fileName}</span>
              <span className="office-read-only-badge">읽기 전용 서식</span>
            </div>
          </div>

          <div className="office-nav-right">
            <button
              type="button"
              className="office-tool-btn"
              onClick={handlePrint}
              title="인쇄"
            >
              <Printer size={15} />
              <span>인쇄</span>
            </button>
            <button
              type="button"
              className="office-tool-btn btn-primary"
              onClick={handleDownload}
              title="파일 다운로드"
            >
              <Download size={14} />
              <span>다운로드</span>
            </button>
            <div className="office-nav-divider" />
            <button
              type="button"
              className="office-btn-close"
              onClick={onClose}
              title="닫기"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 문서 캔버스 영역 */}
        <div className="office-docx-canvas">
          {loading && (
            <div className="office-loading-state">
              <Loader2 size={24} className="office-spinner" />
              <span>문서 서식을 변환하여 표시하고 있습니다...</span>
            </div>
          )}

          {error && (
            <div className="office-error-state">
              <div className="office-error-box">{error}</div>
            </div>
          )}

          <div
            ref={viewerRef}
            className={`office-docx-render-target ${loading || error ? "hidden" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}