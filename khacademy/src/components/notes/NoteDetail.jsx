import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Download,
  FileText,
  Eye
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import DocxPreview from "../docx-preview/DocxPreview";
import NoteComments from "./NoteComments";
import "./NoteDetail.css";

// 인라인 미리보기를 지원하는 확장자 판별 헬퍼
const canPreview = (fileName = "") => {
  return /\.(docx|doc|hwp|hwpx|xlsx|xls|pptx|ppt|pdf|jpg|jpeg|png|gif|webp|svg|txt|json|log|sql|md)$/i.test(fileName);
};

export default function NoteDetail() {
  const { projectNo, noteNo } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [files, setFiles] = useState([]);
  
  // 프로젝트 상태 확인용 상태 (closed 여부 파악)
  const [projectStatus, setProjectStatus] = useState("ACTIVE");

  // 통합 문서 온라인 미리보기 대상 상태 { attachNo, fileName }
  const [previewDocx, setPreviewDocx] = useState(null);

  // 1. 로그인 유저의 사번/멤버 식별 정보 추출 (스토리지 전수 검사 방식 적용)
  const loginUserInfo = useMemo(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (val && (val.includes("empNo") || val.includes("empName"))) {
          try {
            const parsed = JSON.parse(val);
            if (parsed && (parsed.empNo || parsed.empName)) {
              return {
                empNo: Number(parsed.empNo || parsed.memberNo || 0),
                empName: String(parsed.empName || "").trim()
              };
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    return {
      empNo: Number(localStorage.getItem("empNo") || sessionStorage.getItem("empNo") || 0),
      empName: String(localStorage.getItem("empName") || sessionStorage.getItem("empName") || "").trim()
    };
  }, []);

  // 2. 노트 상세 정보, 첨부파일 목록, 프로젝트 정보 조회
  const loadNoteDetail = useCallback(async () => {
    if (!noteNo || isNaN(Number(noteNo))) return;

    try {
      const [noteRes, fileRes, projectRes] = await Promise.all([
        apiClient.get(`/note/${noteNo}`),
        apiClient.get(`/note/file/${noteNo}`),
        apiClient.get(`/project/${projectNo}`)
      ]);

      setNote(noteRes.data);
      setFiles(fileRes.data || []);
      
      if (projectRes.data) {
        const pStatus = projectRes.data.projectStatus || projectRes.data.status || "ACTIVE";
        setProjectStatus(pStatus);
      }
    } catch (e) {
      console.error("데이터 로드 실패:", e);
      toast.error("데이터를 불러오지 못했습니다.");
    }
  }, [noteNo, projectNo]);

  useEffect(() => {
    loadNoteDetail();
  }, [loadNoteDetail]);

  // 3. 💡 [개선] 본인 작성 여부 판별 (사번, 멤버 번호, 이름 일치 여부까지 다중 검사)
  const isOwner = useMemo(() => {
    if (!note) return false;

    const currentEmpNo = Number(loginUserInfo?.empNo || 0);
    const currentEmpName = String(loginUserInfo?.empName || "").trim();

    const noteEmpNo = Number(note.empNo || note.writerEmpNo || note.memberNo || 0);
    const noteWriterName = String(note.writerName || note.empName || note.memberName || "").trim();

    // 1) 사번(empNo) 기준 비교
    if (currentEmpNo > 0 && noteEmpNo > 0 && currentEmpNo === noteEmpNo) {
      return true;
    }

    // 2) 프로젝트 멤버 번호 기준 비교
    const currentMemberNo = Number(
      localStorage.getItem(`project_${projectNo}_memberNo`) || 0
    );
    const noteWriterNo = Number(note.noteWriterNo || note.projectMemberNo || 0);
    if (currentMemberNo > 0 && noteWriterNo > 0 && currentMemberNo === noteWriterNo) {
      return true;
    }

    // 3) 사원 이름 기준 비교 (사번 키값이 누락된 경우를 대비한 보조 안전장치)
    if (currentEmpName && noteWriterName && currentEmpName === noteWriterName) {
      return true;
    }

    return false;
  }, [note, loginUserInfo, projectNo]);

  // 프로젝트가 closed 상태인지 판별하는 플래그
  const isClosed = String(projectStatus).toLowerCase() === "closed";

  // 첨부파일 다운로드 핸들러
  const handleDownloadFile = async (attachNo, attachName) => {
    try {
      const res = await apiClient.get(`/attach/${attachNo}`, {
        responseType: "blob",
        timeout: 0,
      });

      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", attachName || `file_${attachNo}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      console.error("다운로드 실패:", err);
      toast.error("파일 다운로드에 실패했습니다.");
    }
  };

  // 노트 삭제
  const handleDeleteNote = async () => {
    if (isClosed) {
      toast.warn("종료된 프로젝트의 노트는 삭제할 수 없습니다.");
      return;
    }

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
      navigate(`/projects/${projectNo}/notes`);
    } catch (e) {
      console.error("노트 삭제 실패:", e);
      if (e.response?.status === 403) {
        toast.error("노트 삭제 권한이 없습니다. (작성자 본인만 삭제 가능)");
      } else {
        toast.error("노트 삭제에 실패했습니다.");
      }
    }
  };

  if (!note) {
    return <div className="note-detail-loading">노트를 불러오는 중...</div>;
  }

  return (
    <div className="note-detail-page-wrapper">
      {/* 상단 네비게이션 액션 바 */}
      <div className="note-detail-top-bar">
        <button
          type="button"
          className="btn-note-nav-outline"
          onClick={() => navigate(`/projects/${projectNo}/notes`)}
        >
          <ArrowLeft size={15} /> 목록으로
        </button>

        {/* 💡 작성자 본인이고 프로젝트가 closed 상태가 아닐 때 수정/삭제 버튼 노출 */}
        {isOwner && !isClosed && (
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
        )}
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

        {/* 본체 첨부파일 목록 */}
        {files.length > 0 && (
          <div className="note-attached-files-box">
            <div className="note-attached-files-title">
              <FileText size={15} /> 첨부된 문서 ({files.length})
            </div>
            <div className="note-attached-chips-row">
              {files.map((f) => (
                <div key={f.attachNo} className="note-attach-chip-item">
                  <span className="note-attach-filename">
                    {f.attachName} ({(f.attachSize / 1024).toFixed(1)} KB)
                  </span>

                  {canPreview(f.attachName) && (
                    <button
                      type="button"
                      className="btn-open-docx-badge"
                      onClick={() => setPreviewDocx({ attachNo: f.attachNo, fileName: f.attachName })}
                      title="브라우저에서 미리보기"
                    >
                      <Eye size={12} /> 미리보기
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
              ))}
            </div>
          </div>
        )}

        <div className="note-detail-body-content">
          {note.noteContent}
        </div>
      </div>

      {/* 댓글 컴포넌트 */}
      <NoteComments noteNo={noteNo} projectNo={projectNo} projectStatus={projectStatus} />

      {/* 통합 DocxPreview 컴포넌트 */}
      {previewDocx && (
        <DocxPreview
          attachNo={previewDocx.attachNo}
          fileName={previewDocx.fileName}
          onClose={() => setPreviewDocx(null)}
        />
      )}
    </div>
  );
}