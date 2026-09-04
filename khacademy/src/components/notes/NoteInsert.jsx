import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
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
    if (!title.trim()) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("projectNo", projectNo);
      formData.append("noteTitle", title.trim());
      formData.append("noteContent", content);
      formData.append("noteCategory", category);
      files.forEach((file) => formData.append("files", file));

      const res = await apiClient.post("/note/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      navigate(`/projects/${projectNo}/note/${res.data}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notes-page-wrapper">
      <div className="notes-top-header">
        <button className="btn-notes-outline" onClick={() => navigate(`/projects/${projectNo}/note`)}>
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
          required
        />

        {/* 파일 첨부 드롭존 */}
        <div>
          <div className="notes-upload-dropzone" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud size={22} />
            <span>클릭하여 첨부할 파일을 선택하세요</span>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
            />
          </div>

          {files.length > 0 && (
            <div className="attached-chips-row">
              {files.map((file, idx) => (
                <div key={idx} className="attached-chip">
                  <Paperclip size={12} />
                  <span>{file.name}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
          <button type="button" className="btn-notes-outline" onClick={() => navigate(`/projects/${projectNo}/note`)}>
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