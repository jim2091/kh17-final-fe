import React, { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { Viewer as HwpViewer } from "hwp.js";
import { X, Download, FileText, Loader2, Printer, AlertCircle } from "lucide-react";
import { apiClient } from "@utils/reaxios";
import "./DocxPreview.css";

// ArrayBuffer를 바이너리 문자열로 변환
function arrayBufferToBinaryString(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return binary;
}

// 파일 첫 바이트의 16진수 매직 넘버 추출
function getHeaderMagic(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// HWP 내부 절대좌표 요소들의 최대 높이를 계산해 용지 높이를 강제로 늘려주는 함수
function scaleHwpPages(container) {
  if (!container) return;

  const pages = Array.from(container.children);
  if (pages.length === 0) return;

  const availableWidth = (container.parentElement?.clientWidth || window.innerWidth) - 80;

  pages.forEach((page) => {
    const allChildren = page.querySelectorAll("*");
    let maxBottom = 0;

    allChildren.forEach((el) => {
      const bottom = el.offsetTop + el.offsetHeight;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    });

    const requiredHeight = Math.max(page.scrollHeight, maxBottom + 80);

    page.style.setProperty("height", `${requiredHeight}px`, "important");
    page.style.setProperty("min-height", `${requiredHeight}px`, "important");
    page.style.setProperty("background-color", "#ffffff", "important");
    page.style.setProperty("box-shadow", "0 4px 16px rgba(0, 0, 0, 0.15)", "important");
    page.style.setProperty("border", "1px solid #cbd5e1", "important");
    page.style.setProperty("display", "block", "important");
    page.style.setProperty("position", "relative", "important");
    page.style.setProperty("box-sizing", "border-box", "important");
    page.style.margin = "0 auto 40px auto";

    const nativeWidth = page.offsetWidth || page.getBoundingClientRect().width;
    if (!nativeWidth) return;

    if (nativeWidth > availableWidth) {
      const scale = availableWidth / nativeWidth;
      if ("zoom" in page.style) {
        page.style.zoom = scale;
      } else {
        page.style.transformOrigin = "top center";
        page.style.transform = `scale(${scale})`;
      }
    } else {
      page.style.zoom = "1";
      page.style.transform = "none";
    }
  });
}

export default function DocxPreview({ attachNo, fileName, onClose }) {
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [actualIsImage, setActualIsImage] = useState(false);

  const ext = fileName?.split(".").pop()?.toLowerCase() || "";
  const isDocx = ext === "docx";
  const isHwp = ext === "hwp";
  const isPdf = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
  const isTxt = ["txt", "log", "json", "sql", "md", "csv"].includes(ext);

  useEffect(() => {
    if (!attachNo) return;

    let isMounted = true;
    let localBlobUrl = null;
    const abortController = new AbortController();

    const loadFileData = async () => {
      try {
        setLoading(true);
        setError(null);
        setActualIsImage(false);

        // 1. 워드 문서 (.docx)
        if (isDocx) {
          const res = await apiClient.get(`/attach/${attachNo}`, {
            responseType: "arraybuffer",
            signal: abortController.signal,
            timeout: 0,
          });
          if (!isMounted) return;

          if (viewerRef.current) {
            viewerRef.current.style.width = "";
            viewerRef.current.style.height = "";
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
        // 2. 한글 문서 (.hwp)
        else if (isHwp) {
          const res = await apiClient.get(`/attach/${attachNo}`, {
            responseType: "arraybuffer",
            signal: abortController.signal,
            timeout: 0,
          });
          if (!isMounted) return;

          const hexHeader = getHeaderMagic(res.data);

          // 확장자는 hwp이나 실제 파일이 이미지인 경우 자동 우회
          if (
            hexHeader.startsWith("ffd8ff") ||
            hexHeader.startsWith("89504e47") ||
            hexHeader.startsWith("52494646")
          ) {
            let mime = "image/jpeg";
            if (hexHeader.startsWith("89504e47")) mime = "image/png";
            if (hexHeader.startsWith("52494646")) mime = "image/webp";

            const blob = new Blob([res.data], { type: mime });
            localBlobUrl = window.URL.createObjectURL(blob);
            setBlobUrl(localBlobUrl);
            setActualIsImage(true);
            return;
          }

          // 실제 HWP 파일인 경우 렌더링
          if (viewerRef.current) {
            viewerRef.current.style.width = "";
            viewerRef.current.style.height = "";
            viewerRef.current.innerHTML = "";
            try {
              const binaryString = arrayBufferToBinaryString(res.data);
              new HwpViewer(viewerRef.current, binaryString);

              setTimeout(() => {
                if (isMounted) scaleHwpPages(viewerRef.current);
              }, 120);
            } catch (hwpErr) {
              console.error("HWP 렌더링 에러:", hwpErr);
              throw new Error("HWP_RENDER_FAIL");
            }
          }
        }
        // 3. 텍스트 문서
        else if (isTxt) {
          const res = await apiClient.get(`/attach/${attachNo}`, {
            responseType: "text",
            signal: abortController.signal,
            timeout: 0,
          });
          if (!isMounted) return;
          setTextContent(res.data);
        }
        // 4. PDF 및 이미지 문서
        else if (isPdf || isImage) {
          const res = await apiClient.get(`/attach/${attachNo}`, {
            responseType: "blob",
            signal: abortController.signal,
            timeout: 0,
          });
          if (!isMounted) return;

          const mimeType = isPdf ? "application/pdf" : res.headers["content-type"];
          const blob = new Blob([res.data], { type: mimeType });
          localBlobUrl = window.URL.createObjectURL(blob);
          setBlobUrl(localBlobUrl);
          if (isImage) setActualIsImage(true);
        } else {
          if (!isMounted) return;
          setError("해당 확장자는 브라우저 인라인 미리보기를 지원하지 않습니다.");
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error("문서 렌더링 에러:", err);
        if (isMounted) {
          if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
            setError("파일 용량이 커서 다운로드 시간이 초과되었습니다. 상단의 다운로드 버튼을 이용해 주세요.");
          } else if (err?.message === "HWP_RENDER_FAIL") {
            setError("HWP 문서를 표시하는 중 서식 오류가 발생했습니다. 다운로드하여 확인해주세요.");
          } else {
            setError("문서를 불러오는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFileData();

    return () => {
      isMounted = false;
      abortController.abort();
      if (localBlobUrl) {
        window.URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [attachNo, ext, isDocx, isHwp, isPdf, isImage, isTxt]);

  // 창 크기 조절 시 HWP 스케일 재적용
  useEffect(() => {
    if (!isHwp || actualIsImage) return;
    const handleResize = () => scaleHwpPages(viewerRef.current);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isHwp, actualIsImage]);

  // 원본 다운로드
  const handleDownload = async () => {
    try {
      const res = await apiClient.get(`/attach/${attachNo}`, {
        responseType: "blob",
        timeout: 0,
      });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", fileName || `file_${attachNo}.${ext}`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("다운로드 실패:", e);
    }
  };

  return (
    <div className="office-docx-overlay" onClick={onClose}>
      <div className="office-docx-window" onClick={(e) => e.stopPropagation()}>
        <div className="office-docx-nav">
          <div className="office-nav-left">
            <div className="office-doc-icon">
              <FileText size={18} />
            </div>
            <div className="office-doc-info">
              <span className="office-doc-title">{fileName}</span>
              <span className="office-read-only-badge">
                {actualIsImage ? "이미지" : ext.toUpperCase()} 뷰어
              </span>
            </div>
          </div>

          <div className="office-nav-right">
            {(isDocx || (isHwp && !actualIsImage)) && (
              <button
                type="button"
                className="office-tool-btn"
                onClick={() => window.print()}
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

        <div
          className="office-docx-canvas"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: isPdf ? 0 : "30px 16px 80px 16px",
          }}
        >
          {loading && (
            <div className="office-loading-state">
              <Loader2 size={24} className="office-spinner" />
              <span>문서를 불러오는 중입니다...</span>
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

          {/* 워드 / 실제 HWP 문서 렌더링 영역 */}
          {!actualIsImage && (isDocx || isHwp) && (
            <div
              ref={viewerRef}
              className={[
                isDocx ? "office-docx-render-target" : "",
                isHwp ? "office-hwp-render-target" : "",
                loading || error ? "hidden" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          )}

          {/* PDF 뷰어 */}
          {!loading && !error && isPdf && blobUrl && (
            <iframe
              src={blobUrl}
              title={fileName}
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          )}

          {/* 이미지 뷰어 (JPG, PNG, WEBP 및 확장자가 hwp인 위장 이미지 파일 포함) */}
          {!loading && !error && (isImage || actualIsImage) && blobUrl && (
            <img
              src={blobUrl}
              alt={fileName}
              style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: "8px" }}
            />
          )}

          {/* 텍스트 뷰어 */}
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
                  margin: 0,
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