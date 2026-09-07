import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { ArrowLeft, UploadCloud, X, Paperclip, Trash2, FileText } from "lucide-react";
import "./Notes.css";

export default function NoteEdit() {
  const { projectNo, noteNo } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("회의록");
  
  // 기존 서버에 업로드되어 있던 첨부파일 목록
  const [existingFiles, setExistingFiles] = useState([]);
  // 새로 추가할 첨부파일 목록
  const [newFiles, setNewFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  // 1. 기존 노트 정보 및 첨부파일 목록 조회
  const loadNoteData = useCallback(async () => {
    if (!noteNo || isNaN(Number(noteNo))) return;

    try {
      setLoading(true);
      // 백엔드 NoteFileRestController 경로 규격인 /note/file/{noteNo}와 일치
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

  // 새 파일 선택 핸들러
  const handleFileChange = (e) => {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  // 새로 추가한 파일 목록에서 제거
  const handleRemoveNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 기존 서버 첨부파일 단건 삭제
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
      await apiClient.delete(`/note/file/${attachNo}`);
      toast.success("파일이 삭제되었습니다.");
      setExistingFiles((prev) => prev.filter((f) => f.attachNo !== attachNo));
    } catch (e) {
      console.error("파일 삭제 실패:", e);
      toast.error("파일 삭제에 실패했습니다.");
    }
  };

  // 2. 노트 내용 수정 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warn("제목을 입력해주세요.");
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

      // 끝자리 슬래시 문제 방지를 위해 /note 로 호출 (만약 백엔드가 /{noteNo} 구조라면 /note/${noteNo} 로 변경)
      try {
        await apiClient.put(`/note`, updatePayload);
      } catch (putErr) {
        if (putErr.response?.status === 404) {
          // 백엔드가 @PutMapping("/{noteNo}") 구조일 경우 대비한 Fallback
          await apiClient.put(`/note/${noteNo}`, updatePayload);
        } else {
          throw putErr;
        }
      }

      // 새로 첨부된 파일이 있으면 백엔드 @RequestPart("file") 규격에 맞게 순차 업로드
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
            <span>새 첨부파일을 추가하려면 클릭하세요</span>
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