import React, { useState, useEffect, useRef } from "react";
import { Paperclip, Download, Trash2, FileText, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";
import "./TaskAttachmentSection.css";

export default function TaskAttachmentSection({ taskNo, projectNo }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // 업무 본체 파일 목록 조회
  const fetchTaskFiles = async () => {
    if (!taskNo) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/task/file/${taskNo}`);
      setFiles(res.data || []);
    } catch (error) {
      console.error("업무 파일 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskFiles();
  }, [taskNo]);

  // 업무 파일 업로드
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiClient.post(
        `/task/file/${taskNo}?projectNo=${projectNo || 0}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success("업무 파일이 업로드되었습니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchTaskFiles();
    } catch (error) {
      console.error("파일 업로드 실패:", error);
      toast.error("파일 업로드에 실패했습니다.");
    }
  };

  // 파일 삭제
  const handleDelete = async (attachNo) => {
    if (!window.confirm("파일을 삭제하시겠습니까?")) return;
    try {
      await apiClient.delete(`/task/file/${taskNo}/${attachNo}`);
      toast.success("파일이 삭제되었습니다.");
      fetchTaskFiles();
    } catch (error) {
      console.error("파일 삭제 실패:", error);
      toast.error("파일 삭제에 실패했습니다.");
    }
  };

  // 다운로드
  const handleDownload = (attachNo) => {
    window.open(`http://localhost:8080/api/attach/${attachNo}`, "_blank");
  };

  return (
    <div className="task-attach-section">
      <div className="attach-section-header">
        <div className="header-title">
          <Paperclip size={15} />
          <span>첨부파일 ({files.length})</span>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleUpload}
        />
        <button
          type="button"
          className="btn-upload-file"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={13} />
          <span>파일 올리기</span>
        </button>
      </div>

      <div className="attach-files-box">
        {loading ? (
          <div className="attach-empty">파일 목록을 불러오는 중...</div>
        ) : files.length === 0 ? (
          <div className="attach-empty">첨부된 파일이 없습니다.</div>
        ) : (
          files.map((file) => (
            <div key={file.attachNo} className="attach-item-row">
              <div className="file-info" onClick={() => handleDownload(file.attachNo)}>
                <FileText size={15} className="file-icon" />
                <span className="file-name">{file.attachName}</span>
                <span className="file-size">({(file.attachSize / 1024).toFixed(1)} KB)</span>
              </div>
              <div className="file-actions">
                <button
                  type="button"
                  className="btn-file-icon"
                  onClick={() => handleDownload(file.attachNo)}
                  title="다운로드"
                >
                  <Download size={13} />
                </button>
                <button
                  type="button"
                  className="btn-file-icon text-danger"
                  onClick={() => handleDelete(file.attachNo)}
                  title="삭제"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}