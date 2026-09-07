import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { renderAsync } from "docx-preview";
import { apiClient } from "@utils/reaxios";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Download,
  FileText,
  Eye,
  Loader2,
  X
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import NoteComments from "./NoteComments";
import "./NoteDetail.css";

// 이미지 파일 여부 판별 헬퍼[cite: 1]
const isImageFile = (fileName = "") => {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
};

export default function NoteDetail() {
  const { projectNo, noteNo } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [files, setFiles] = useState([]);

  // 워드 문서 (.docx) 온라인 미리보기 상태
  const [previewDocx, setPreviewDocx] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState(null);
  const docxContainerRef = useRef(null);

  // 노트 정보 및 첨부파일 목록 조회
  const loadNoteDetail = useCallback(async () => {
    if (!noteNo || isNaN(Number(noteNo))) return;

    try {
      const [noteRes, fileRes] = await Promise.all([
        apiClient.get(`/note/${noteNo}`),
        apiClient.get(`/note/file/${noteNo}`)
      ]);

      setNote(noteRes.data);
      setFiles(fileRes.data || []);
    } catch (e) {
      console.error("노트 데이터 로드 실패:", e);
      toast.error("노트 데이터를 불러오지 못했습니다.");
    }
  }, [noteNo]);

  useEffect(() => {
    loadNoteDetail();
  }, [loadNoteDetail]);

  // 목록으로 돌아가기 안전 핸들러
  const handleGoBackToList = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(`/projects/${projectNo}/note`);
    }
  };

  // docx-preview 워드 문서 렌더링
  useEffect(() => {
    if (!previewDocx) return;
    let isSubscribed = true;

    const renderDocxOnline = async () => {
      try {
        setViewerLoading(true);
        setViewerError(null);
        const res = await apiClient.get(`/attach/${previewDocx.attachNo}`, {
          responseType: "arraybuffer"
        });

        if (!isSubscribed) return;

        if (docxContainerRef.current) {
          docxContainerRef.current.innerHTML = "";
          await renderAsync(res.data, docxContainerRef.current, null, {
            className: "docx-doc-page",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true
          });
        }
      } catch (err) {
        console.error("워드 문서 렌더링 실패:", err);
        if (isSubscribed) {
          setViewerError("워드 문서 양식을 웹 화면으로 불러오지 못했습니다.");
        }
      } finally {
        if (isSubscribed) setViewerLoading(false);
      }
    };

    renderDocxOnline();
    return () => { isSubscribed = false; };
  }, [previewDocx]);

  // 파일 다운로드 핸들러
  const handleDownloadFile = async (attachNo, attachName) => {
    try {
      const res = await apiClient.get(`/attach/${attachNo}`, {
        responseType: "blob"
      });

      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", attachName || `file_${attachNo}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("다운로드 실패:", err);
      toast.error("파일 다운로드에 실패했습니다.");
    }
  };

  // 노트 삭제
  const handleDeleteNote = async () => {
    const result = await Swal.fire({
      title: "노트 삭제",
      text: "정말 노트를 삭제하시겠습니까? 관련 댓글과 첨부파일도 함께 삭제됩니다.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "삭제",
      cancelButtonText: "취소"
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(`/note/${noteNo}`);
      toast.success("노트가 삭제되었습니다.");
      handleGoBackToList();
    } catch (e) {
      console.error("노트 삭제 실패:", e);
      toast.error("노트 삭제에 실패했습니다.");
    }
  };

  if (!note) {
    return <div className="note-detail-loading">노트를 불러오는 중...</div>;
  }

  // 첨부파일을 이미지와 일반 문서로 분류[cite: 1]
  const imageFiles = files.filter((f) => isImageFile(f.attachName));
  const docFiles = files.filter((f) => !isImageFile(f.attachName));

  return (
    <div className="note-detail-page-wrapper">
      {/* 상단 툴바: 목록으로 버튼 */}
      <div className="note-detail-top-bar">
        <button
          type="button"
          className="btn-note-nav-outline"
          onClick={handleGoBackToList}
        >
          <ArrowLeft size={15} /> 목록으로
        </button>
        <div className="note-top-action-group">
          <button
            type="button"
            className="btn-note-nav-outline"
            onClick={() => navigate(`/projects/${projectNo}/note/${noteNo}/edit`)}
          >
            <Edit3 size={14} /> 수정
          </button>
          <button
            type="button"
            className="btn-note-nav-danger"
            onClick={handleDeleteNote}
          >
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      </div>

      {/* 본체 상세 카드 */}
      <div className="note-detail-main-card">
        <div className="note-detail-card-head">
          <span className="note-card-category-badge">#{note.noteCategory || "일반"}</span>
          <h1 className="note-card-title-text">{note.noteTitle}</h1>
        </div>

        <div className="note-card-meta-row">
          <span>작성자: <strong>{note.writerName || note.empName || "사원"}</strong></span>
          <span>
            작성일: {note.noteCtime ? String(note.noteCtime).slice(0, 10) : "-"}
            {note.noteUtime && <strong className="note-edited-tag"> (수정됨)</strong>}
          </span>
          <span>문서번호: #{note.noteNo}</span>
        </div>

        {/* 1. 본문 텍스트 */}
        <div className="note-detail-body-content">
          {note.noteContent}
        </div>

        {/* 2. 첨부된 이미지 인라인 노출 (일반 글처럼 사진 표시)[cite: 1] */}
        {imageFiles.length > 0 && (
          <div className="note-inline-images-gallery">
            {imageFiles.map((img) => (
              <div key={img.attachNo} className="note-inline-image-item">
                <img
                  src={`http://localhost:8080/api/attach/${img.attachNo}`}
                  alt={img.attachName}
                  className="note-inline-img"
                  onClick={() => window.open(`http://localhost:8080/api/attach/${img.attachNo}`, "_blank")}
                  title="클릭 시 새 탭에서 원본 보기"
                />
                <div className="note-inline-img-caption">
                  <span>{img.attachName}</span>
                  <button
                    type="button"
                    className="btn-img-direct-dl"
                    onClick={() => handleDownloadFile(img.attachNo, img.attachName)}
                    title="다운로드"
                  >
                    <Download size={13} /> 다운로드
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. 일반 문서 첨부파일 목록 (워드, PDF 등)[cite: 1] */}
        {docFiles.length > 0 && (
          <div className="note-attached-files-box">
            <div className="note-attached-files-title">
              <FileText size={15} /> 첨부된 문서 ({docFiles.length})
            </div>
            <div className="note-attached-chips-row">
              {docFiles.map((f) => {
                const isDocx = f.attachName?.toLowerCase().endsWith(".docx");

                return (
                  <div key={f.attachNo} className="note-attach-chip-item">
                    <span className="note-attach-filename">
                      {f.attachName} ({(f.attachSize / 1024).toFixed(1)} KB)
                    </span>

                    {/* 워드 문서 양식 열기 */}
                    {isDocx && (
                      <button
                        type="button"
                        className="btn-open-docx-badge"
                        onClick={() => setPreviewDocx({ attachNo: f.attachNo, fileName: f.attachName })}
                        title="브라우저에서 양식 열기"
                      >
                        <Eye size={12} /> 양식
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-attach-icon-dl"
                      onClick={() => handleDownloadFile(f.attachNo, f.attachName)}
                      title="다운로드"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 댓글 컴포넌트 */}
      <NoteComments noteNo={noteNo} projectNo={projectNo} />

      {/* 워드 모달 */}
      {previewDocx && (
        <div className="note-docx-modal-backdrop" onClick={() => setPreviewDocx(null)}>
          <div className="note-docx-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="note-docx-modal-head">
              <div className="modal-head-title-area">
                <FileText size={18} color="#60a5fa" />
                <span className="modal-head-filename">{previewDocx.fileName}</span>
                <span className="modal-head-tag">인터넷 양식 뷰어</span>
              </div>

              <div className="modal-head-actions-area">
                <button
                  type="button"
                  className="btn-modal-download-primary"
                  onClick={() => handleDownloadFile(previewDocx.attachNo, previewDocx.fileName)}
                >
                  <Download size={13} /> 다운로드
                </button>
                <button
                  type="button"
                  className="btn-modal-close-icon"
                  onClick={() => setPreviewDocx(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="note-docx-modal-body">
              {viewerLoading && (
                <div className="modal-render-loading">
                  <Loader2 size={20} className="animate-spin" />
                  <span>문서 양식을 웹 화면으로 변환 중입니다...</span>
                </div>
              )}

              {viewerError && (
                <div className="modal-render-error-box">{viewerError}</div>
              )}

              <div
                ref={docxContainerRef}
                className={`note-docx-render-viewport ${viewerLoading || viewerError ? "hidden" : ""}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}