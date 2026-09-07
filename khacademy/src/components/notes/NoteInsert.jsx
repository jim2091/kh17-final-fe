import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import { toast } from "react-toastify";
import { ArrowLeft, UploadCloud, X, Paperclip } from "lucide-react";
import "./Notes.css";

export default function NoteInsert() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("회의록");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warn("노트 제목을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      // 1. 노트 본문 등록 (JSON 규격)
      const notePayload = {
        noteTitle: title.trim(),
        noteContent: content,
        noteCategory: category
      };

      const res = await apiClient.post(`/note/project/${projectNo}`, notePayload);

      // [핵심] res.data 자체가 숫자(PK)일 때와 객체({ noteNo: X })일 때 모두 안전하게 추출
      let newNoteNo = null;
      if (typeof res.data === "number") {
        newNoteNo = res.data;
      } else if (res.data?.noteNo) {
        newNoteNo = res.data.noteNo;
      } else if (res.data?.data?.noteNo) {
        newNoteNo = res.data.data.noteNo;
      } else if (typeof res.data?.data === "number") {
        newNoteNo = res.data.data;
      }

      // 2. newNoteNo를 바탕으로 첨부파일 순차 업로드
      if (files.length > 0 && newNoteNo) {
        for (const file of files) {
          const formData = new FormData();
          // 백엔드 NoteFileRestController: @RequestPart("file") 규격 일치
          formData.append("file", file);

          try {
            await apiClient.post(
              `/note/file/${newNoteNo}?projectNo=${projectNo || 0}`,
              formData
            );
          } catch (fileErr) {
            console.error("파일 업로드 개별 실패:", fileErr);
          }
        }
      }

      toast.success("노트가 성공적으로 등록되었습니다.");
      navigate(`/projects/${projectNo}/note/${newNoteNo}`);
    } catch (err) {
      console.error("노트 등록 실패:", err);
      toast.error("노트 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notes-page-wrapper">
      <div className="notes-top-header">
        <button
          type="button"
          className="btn-notes-outline"
          onClick={() => navigate(`/projects/${projectNo}/notes`)}
        >
          <ArrowLeft size={15} /> 목록으로
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>새 노트 작성</h2>
      </div>

      <form onSubmit={handleSubmit} className="note-form-container">
        <div className="note-form-row">
          <input
            type="text"
            className="note-form-input"
            placeholder="노트 제목을 입력하세요"
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

        {/* 파일 첨부 드롭존 영역 */}
        <div>
          <div
            className="notes-upload-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={22} />
            <span>클릭하여 첨부할 파일을 선택하세요</span>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) =>
                setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])
              }
            />
          </div>

          {files.length > 0 && (
            <div className="attached-chips-row">
              {files.map((file, idx) => (
                <div key={idx} className="attached-chip">
                  <Paperclip size={12} />
                  <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
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
            onClick={() => navigate(`/projects/${projectNo}/notes`)}
          >
            취소
          </button>
          <button type="submit" className="btn-notes-primary" disabled={saving}>
            {saving ? "저장 중..." : "노트 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}