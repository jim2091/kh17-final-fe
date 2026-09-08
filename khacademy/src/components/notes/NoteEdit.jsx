import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { ArrowLeft, UploadCloud, X, Paperclip, Trash2, FileText } from "lucide-react";
import "./Notes.css";

// 👈 1. 1MB 용량 상수 선언 (반드시 컴포넌트 외부에 위치)
const MAX_FILE_SIZE = 1 * 1024 * 1024;

export default function NoteEdit() {
  const { projectNo, noteNo } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("회의록");

  const [existingFiles, setExistingFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  // 기존 노트 정보 로드
  const loadNoteData = useCallback(async () => {
    if (!noteNo || isNaN(Number(noteNo))) return;

    try {
      setLoading(true);
      const [resNote, resFiles] = await Promise.all([
        apiClient.get(`/note/${noteNo}`),
        apiClient.get(`/note/file/${noteNo}`)
      ]);

      const note = resNote.data;
      setTitle(note.noteTitle || "");
      setContent(note.noteContent || "");
      setCategory(note.noteCategory || "회의록");
      setExistingFiles(resFiles.data || []);
    } catch (e) {
      console.error("노트 정보 로드 실패:", e);
      toast.error("노트 정보를 불러오지 못했습니다.");
      navigate(`/projects/${projectNo}/notes`);
    } finally {
      setLoading(false);
    }
  }, [noteNo, projectNo, navigate]);

  useEffect(() => {
    loadNoteData();
  }, [loadNoteData]);

  // 👈 2. 파일 선택 핸들러 (1MB 초과 즉시 toast 차단 및 setNewFiles 적용)
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // 1MB 초과 파일 존재 여부 검사
    const overSizedFile = selectedFiles.find((f) => f.size > MAX_FILE_SIZE);

    if (overSizedFile) {
      const currentMB = (overSizedFile.size / (1024 * 1024)).toFixed(1);
      toast.warn(
        `"${overSizedFile.name}" 파일이 1MB를 초과했습니다. (현재: ${currentMB}MB) 1MB 이하의 파일만 첨부할 수 있습니다.`
      );

      // 인풋 비우고 첨부 중단
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // 정상 통과 시 newFiles 상태에 추가 (setFiles 버그 수정 완료)
    setNewFiles((prev) => [...prev, ...selectedFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDeleteExistingFile = async (attachNo) => {
    const result = await Swal.fire({
      title: "파일 삭제",
      text: "첨부파일을 삭제하시겠습니까?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "삭제",
      cancelButtonText: "취소"
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(`/note/file/${noteNo}/${attachNo}`);
      toast.success("파일이 삭제되었습니다.");
      setExistingFiles((prev) => prev.filter((f) => f.attachNo !== attachNo));
    } catch (e) {
      console.error("파일 삭제 실패:", e);
      toast.error("파일 삭제에 실패했습니다.");
    }
  };

  // 수정 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warn("제목을 입력해주세요.");
      return;
    }

    // 2차 사전 방어 (newFiles 기준)
    const overSizedFile = newFiles.find((f) => f.size > MAX_FILE_SIZE);
    if (overSizedFile) {
      toast.warn(`1MB를 초과하는 첨부파일("${overSizedFile.name}")이 포함되어 있습니다.`);
      return;
    }

    try {
      setSaving(true);

      const updatePayload = {
        noteNo: Number(noteNo),
        projectNo: Number(projectNo),
        noteTitle: title.trim(),
        noteContent: content,
        noteCategory: category
      };

      try {
        await apiClient.put(`/note`, updatePayload);
      } catch (putErr) {
        if (putErr.response?.status === 404) {
          await apiClient.put(`/note/${noteNo}`, updatePayload);
        } else {
          throw putErr;
        }
      }

      if (newFiles.length > 0) {
        for (const file of newFiles) {
          const formData = new FormData();
          formData.append("file", file);
          try {
            await apiClient.post(
              `/note/file/${noteNo}?projectNo=${projectNo || 0}`,
              formData
            );
          } catch (fileErr) {
            console.error("새 첨부파일 업로드 실패:", fileErr);
          }
        }
      }

      toast.success("노트가 성공적으로 수정되었습니다.");
      navigate(`/projects/${projectNo}/note/${noteNo}`);
    } catch (err) {
      console.error("노트 수정 실패:", err);
      toast.error("노트 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="notes-page-wrapper">노트 정보를 불러오는 중...</div>;

  return (
    <div className="notes-page-wrapper">
      <div className="notes-top-header">
        <button
          type="button"
          className="btn-notes-outline"
          onClick={() => navigate(`/projects/${projectNo}/note/${noteNo}`)}
        >
          <ArrowLeft size={15} /> 상세 화면으로
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>노트 수정</h2>
      </div>

      <form onSubmit={handleSubmit} className="note-form-container">
        <div className="note-form-row">
          <input
            type="text"
            className="note-form-input"
            placeholder="노트 제목을 입력하세요..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <select
            className="notes-select-type"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="회의록">회의록</option>
            <option value="아이디어">아이디어</option>
            <option value="기획서">기획서</option>
            <option value="참고자료">참고자료</option>
          </select>
        </div>

        <textarea
          className="note-form-textarea"
          placeholder="본문 내용을 입력하세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          required
        />

        {/* 기존 첨부파일 목록 */}
        {existingFiles.length > 0 && (
          <div className="note-files-card">
            <div className="note-files-card-title">
              <FileText size={15} /> 기존 첨부파일 ({existingFiles.length})
            </div>
            <div className="attached-chips-row">
              {existingFiles.map((file) => (
                <div key={file.attachNo} className="attached-chip">
                  <Paperclip size={12} />
                  <span>{file.attachName} ({(file.attachSize / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteExistingFile(file.attachNo)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                    title="파일 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 새 파일 추가 드롭존 */}
        <div>
          <div
            className="notes-upload-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={22} />
            <span>새 첨부파일을 추가하려면 클릭하세요 (최대 1MB)</span>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>

          {newFiles.length > 0 && (
            <div className="attached-chips-row">
              {newFiles.map((file, idx) => (
                <div key={idx} className="attached-chip">
                  <Paperclip size={12} />
                  <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(idx)}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn-notes-outline"
            onClick={() => navigate(`/projects/${projectNo}/note/${noteNo}`)}
          >
            취소
          </button>
          <button type="submit" className="btn-notes-primary" disabled={saving}>
            {saving ? "수정 중..." : "수정 완료"}
          </button>
        </div>
      </form>
    </div>
  );
}