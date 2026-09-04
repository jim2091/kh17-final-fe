import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import { ArrowLeft, UploadCloud, X, Paperclip, Trash2 } from "lucide-react";
import "./Notes.css";

export default function NoteEdit() {
  const { projectNo, noteNo } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("회의록");
  const [existingFiles, setExistingFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [resNote, resFiles] = await Promise.all([
        apiClient.get(`/note/${noteNo}`),
        apiClient.get(`/note/file/list/${noteNo}`)
      ]);
      setTitle(resNote.data.noteTitle || "");
      setContent(resNote.data.noteContent || "");
      setCategory(resNote.data.noteCategory || "회의록");
      setExistingFiles(resFiles.data || []);
    } catch (e) {
      console.error(e);
    }
  }, [noteNo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteExistingFile = async (attachNo) => {
    if (!window.confirm("파일을 삭제하시겠습니까?")) return;
    try {
      await apiClient.delete(`/note/file/${attachNo}`);
      setExistingFiles((prev) => prev.filter((f) => f.attachNo !== attachNo));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiClient.put("/note/", {
        noteNo: Number(noteNo),
        projectNo: Number(projectNo),
        noteTitle: title.trim(),
        noteContent: content,
        noteCategory: category
      });

      if (newFiles.length > 0) {
        const formData = new FormData();
        formData.append("projectNo", projectNo);
        newFiles.forEach((f) => formData.append("files", f));
        await apiClient.post(`/note/file/${noteNo}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      navigate(`/projects/${projectNo}/note/${noteNo}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notes-page-wrapper">
      <div className="notes-top-header">
        <button className="btn-notes-outline" onClick={() => navigate(`/projects/${projectNo}/note/${noteNo}`)}>
          <ArrowLeft size={15} /> 상세 화면으로
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>노트 수정</h2>
      </div>

      <form onSubmit={handleSubmit} className="note-form-container">
        <div className="note-form-row">
          <input
            type="text"
            className="note-form-input"
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
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />

        {/* 기존 등록 파일 */}
        {existingFiles.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
              기존 첨부파일 ({existingFiles.length})
            </div>
            <div className="attached-chips-row">
              {existingFiles.map((f) => (
                <div key={f.attachNo} className="attached-chip">
                  <Paperclip size={12} />
                  <span>{f.attachName}</span>
                  <button type="button" onClick={() => handleDeleteExistingFile(f.attachNo)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 새 파일 추가 */}
        <div>
          <div className="notes-upload-dropzone" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud size={22} />
            <span>새 첨부파일을 추가하려면 클릭하세요</span>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => setNewFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
            />
          </div>

          {newFiles.length > 0 && (
            <div className="attached-chips-row">
              {newFiles.map((file, idx) => (
                <div key={idx} className="attached-chip">
                  <Paperclip size={12} />
                  <span>{file.name}</span>
                  <button type="button" onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== idx))}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
          <button type="button" className="btn-notes-outline" onClick={() => navigate(`/projects/${projectNo}/note/${noteNo}`)}>
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