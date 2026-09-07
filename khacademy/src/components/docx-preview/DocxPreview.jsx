import React, { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { X, Download, FileText, Loader2 } from "lucide-react";
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

        // 1. apiClient로 인증 토큰을 동봉하여 ArrayBuffer(바이너리)로 수신
        const res = await apiClient.get(`/attach/${attachNo}`, {
          responseType: "arraybuffer",
        });

        if (!isMounted) return;

        // 2. docx-preview 엔진을 통해 DOM 컨테이너에 A4 워드 양식 인라인 렌더링
        if (viewerRef.current) {
          viewerRef.current.innerHTML = "";
          await renderAsync(res.data, viewerRef.current, null, {
            className: "docx-doc-page",
            inWrapper: true,      // 용지 여백 및 페이지 형태 래퍼 생성
            ignoreWidth: false,   // 표/문단 너비 비율 유지
            ignoreHeight: false,  // 줄간격 및 페이지 높이 유지
            breakPages: true      // 페이지 나누기 반영
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

  // 모달 내부에서 직접 다운로드 지원
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

  return (
    <div className="docx-modal-overlay" onClick={onClose}>
      <div className="docx-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* 상단 툴바 */}
        <div className="docx-toolbar">
          <div className="docx-toolbar-title-wrap">
            <FileText size={18} className="docx-icon" />
            <span className="docx-filename">{fileName}</span>
            <span className="docx-badge">온라인 양식 뷰어</span>
          </div>

          <div className="docx-toolbar-actions">
            <button
              type="button"
              className="docx-btn-download"
              onClick={handleDownload}
            >
              <Download size={13} /> 다운로드
            </button>
            <button
              type="button"
              className="docx-btn-close"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 워드 문서 실제 출력 영역 */}
        <div className="docx-viewer-viewport">
          {loading && (
            <div className="docx-status-loading">
              <Loader2 size={20} className="docx-spinner" />
              <span>문서 서식을 웹 양식으로 변환하는 중입니다...</span>
            </div>
          )}

          {error && (
            <div className="docx-status-error">
              {error}
            </div>
          )}

          {/* docx-preview가 생성한 HTML이 주입되는 래퍼 */}
          <div
            ref={viewerRef}
            className={`docx-render-wrapper ${loading || error ? "hidden" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}