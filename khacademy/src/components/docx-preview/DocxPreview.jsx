import React, { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { X, Download, FileText, Loader2, Printer, AlertCircle } from "lucide-react";
import { apiClient } from "@utils/reaxios";
import "./DocxPreview.css";

export default function DocxPreview({ attachNo, fileName, onClose }) {
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // PDF 및 이미지용 Blob URL
  const [blobUrl, setBlobUrl] = useState(null);
  // 텍스트/코드 파일용 본문 내용
  const [textContent, setTextContent] = useState("");

  // 확장자 분리 및 유형 판별
  const ext = fileName?.split(".").pop()?.toLowerCase() || "";
  const isDocx = ext === "docx";
  const isPdf = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
  const isTxt = ["txt", "log", "json", "sql", "md", "csv"].includes(ext);

  useEffect(() => {
    if (!attachNo) return;

    let isMounted = true;
    let localBlobUrl = null;
    //(보충)중복 요청 방지 및 취소 토큰
    const abortController = new AbortController();

    const loadFileData = async () => {
      try {
        setLoading(true);
        setError(null);

        //워드 문서 (.docx): 기존 docx-preview 엔진으로 렌더링
        if (isDocx) {
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
        }
        //텍스트 / 코드 문서 (.txt, .log, .json 등)
        else if (isTxt) {
          const res = await apiClient.get(`/attach/${attachNo}`, {
            responseType: "text",
            signal: abortController.signal
          });
          if (!isMounted) return;
          setTextContent(res.data);
        }
        //PDF 및 이미지: Blob으로 받아 브라우저 인라인 표시
        else if (isPdf || isImage) {
          const res = await apiClient.get(`/attach/${attachNo}`, {
            responseType: "blob",
            signal: abortController.signal
          });
          if (!isMounted) return;

          const mimeType = isPdf ? "application/pdf" : res.headers["content-type"];
          const blob = new Blob([res.data], { type: mimeType });
          localBlobUrl = window.URL.createObjectURL(blob);
          setBlobUrl(localBlobUrl);
        }
        //인라인 뷰어 미지원 확장자 (xlsx, pptx, zip, hwp 등)
        else {
          if (!isMounted) return;
          setError("해당 확장자는 브라우저 인라인 미리보기를 지원하지 않습니다.");
        }
      } catch (err) {
        console.error("문서 렌더링 에러:", err);
        if (isMounted) {
          setError("문서를 불러오는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFileData();

    //클린업 함수(?)
    return () => {
      isMounted = false;
      if (localBlobUrl) {
        window.URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [attachNo, ext, isDocx, isPdf, isImage, isTxt]);

  // 다운로드 처리
  const handleDownload = async () => {
    try {
      const res = await apiClient.get(`/attach/${attachNo}`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", fileName || `file_${attachNo}.${ext}`);
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(()=>{
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      console.error("다운로드 실패:", e);
    }
  };

  //첨부파일 인쇄 (docx-preview 에서 제공)
  const handlePrint = () => {
    window.print();
  };

  //view
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
              <span className="office-read-only-badge">
                {ext.toUpperCase()} 뷰어
              </span>
            </div>
          </div>

          <div className="office-nav-right">
            {isDocx && (
              <button
                type="button"
                className="office-tool-btn"
                onClick={handlePrint}
                title="인쇄"
              >
                <Printer size={15} />
                <span>인쇄</span>
              </button>
            )}
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

        {/* 문서 캔버스 뷰포트 */}
        <div 
          className="office-docx-canvas" 
          style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: isImage ? "center" : "stretch",
            padding: isPdf ? 0 : undefined 
          }}
        >
          {loading && (
            <div className="office-loading-state">
              <Loader2 size={24} className="office-spinner" />
              <span>문서 서식을 변환하여 표시하고 있습니다...</span>
            </div>
          )}

          {error && (
            <div className="office-error-state" style={{ margin: "auto", textAlign: "center" }}>
              <AlertCircle size={32} color="#ef4444" style={{ margin: "0 auto 8px" }} />
              <div className="office-error-box">{error}</div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
                상단의 다운로드 버튼을 눌러 PC에서 직접 열어주세요.
              </p>
            </div>
          )}

          {/* 1. 워드 문서 (.docx) */}
          {isDocx && (
            <div
              ref={viewerRef}
              className={`office-docx-render-target ${loading || error ? "hidden" : ""}`}
            />
          )}

          {/* 2. PDF 문서 (.pdf) */}
          {!loading && !error && isPdf && blobUrl && (
            <iframe
              src={blobUrl}
              title={fileName}
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          )}

          {/* 3. 이미지 문서 (.png, .jpg 등) */}
          {!loading && !error && isImage && blobUrl && (
            <img
              src={blobUrl}
              alt={fileName}
              style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: "8px" }}
            />
          )}

          {/* 4. 텍스트 / 코드 문서 (.txt, .json 등) */}
          {!loading && !error && isTxt && (
            <div style={{ padding: "20px", width: "100%", height: "100%", boxSizing: "border-box" }}>
              <pre
                style={{
                  backgroundColor: "#ffffff",
                  padding: "16px",
                  borderRadius: "8px",
                  height: "100%",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  boxSizing: "border-box",
                  margin: 0
                }}
              >
                {textContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}