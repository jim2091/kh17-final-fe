import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Paperclip, X, FileText } from "lucide-react";
import { apiClient } from "@utils/reaxios";
import "./TaskInsert.css";

export default function TaskInsert() {
  const { projectNo } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // 프로젝트 참여 멤버 목록 (담당자 & 협업자 선택용)
  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 폼 입력 상태 (taskProgress 제거)
  const [formData, setFormData] = useState({
    taskTitle: "",
    taskContent: "",
    assignedMemberNo: "",
    taskStatus: "TODO",
    taskPriority: "보통",
    taskCategory: "",
    taskStart: "",
    taskEnd: ""
  });

  // 다중 협업자 선택 상태 (projectMemberNo 배열)
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);

  // 첨부파일 목록 상태 (업로드 대기 중인 File 객체 배열)
  const [selectedFiles, setSelectedFiles] = useState([]);

  // 프로젝트 참여 멤버 목록 조회
  useEffect(() => {
    if (projectNo) {
      findProjectMembers(projectNo);
    }
  }, [projectNo]);

  const findProjectMembers = async (pNo) => {
    try {
      setLoadingMembers(true);
      const res = await apiClient.get(`/project/${pNo}/member`);
      const memberList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProjectMembers(memberList);
    } catch (error) {
      console.warn("프로젝트 멤버 목록 로딩 실패:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // 폼 필드 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nextForm = { ...prev, [name]: value };

      // 주 담당자로 지정된 인원은 협업자 목록에서 자동 제외
      if (name === "assignedMemberNo" && value) {
        const selectedAssignedNo = Number(value);
        setSelectedCollaborators((collabs) =>
          collabs.filter((id) => id !== selectedAssignedNo)
        );
      }
      return nextForm;
    });
  };

  // 협업자 다중 토글 핸들러
  const handleCollaboratorToggle = (memberNo) => {
    setSelectedCollaborators((prev) =>
      prev.includes(memberNo)
        ? prev.filter((id) => id !== memberNo)
        : [...prev, memberNo]
    );
  };

  // 첨부파일 선택 핸들러
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 중복 파일명 체크 후 병합
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = files.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 첨부파일 삭제 핸들러
  const handleRemoveFile = (fileName) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // 업무 등록 및 파일 업로드 제출
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.taskTitle.trim()) {
      toast.warn("업무 제목은 필수 입력 항목입니다.");
      return;
    }

    if (formData.taskStart && formData.taskEnd && formData.taskStart > formData.taskEnd) {
      toast.warn("마감일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    const payload = {
      projectNo: Number(projectNo),
      taskTitle: formData.taskTitle.trim(),
      taskContent: formData.taskContent ? formData.taskContent.trim() : null,
      assignedMemberNo:
        formData.assignedMemberNo && Number(formData.assignedMemberNo) > 0
          ? Number(formData.assignedMemberNo)
          : null,
      taskStatus: formData.taskStatus || "TODO",
      taskPriority: formData.taskPriority || "보통",
      taskCategory: formData.taskCategory ? formData.taskCategory.trim() : null,
      taskStart: formData.taskStart ? `${formData.taskStart} 00:00:00` : null,
      taskEnd: formData.taskEnd ? `${formData.taskEnd} 23:59:59` : null,
      collaboratorMemberNos: selectedCollaborators
    };

    try {
      setSubmitting(true);
      
      // 1. 업무 기본 정보 등록
      const res = await apiClient.post("/task/", payload);
      const createdTaskNo = res.data?.taskNo || res.data;

      // 2. 첨부파일이 선택되어 있다면 순차 업로드 실행
      if (createdTaskNo && selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileFormData = new FormData();
          fileFormData.append("file", file);
          await apiClient.post(
            `/task/file/${createdTaskNo}?projectNo=${projectNo}`,
            fileFormData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
        }
      }

      toast.success("신규 업무가 성공적으로 등록되었습니다.");
      navigate(`/projects/${projectNo}/task`);
    } catch (error) {
      console.error("업무 등록 실패:", error);
      toast.error("업무 등록에 실패했습니다. 백엔드 콘솔을 확인하세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 주 담당자 제외 협업자 명단 필터링
  const currentAssignedNo = formData.assignedMemberNo ? Number(formData.assignedMemberNo) : null;
  const availableCollaboratorMembers = projectMembers.filter(
    (m) => !currentAssignedNo || m.projectMemberNo !== currentAssignedNo
  );

  return (
    <div className="task-create-container">
      {/* 상단 헤더 */}
      <div className="task-create-header">
        <div>
          <button className="back-link-btn" onClick={() => navigate(-1)}>
            ← 보드로 돌아가기
          </button>
          <h2>새 업무 등록</h2>
          <p className="sub-desc">
            제목을 필수로 입력하고, 나머지 세부 속성은 필요에 따라 점진적으로 작성하세요.
          </p>
        </div>
      </div>

      {/* 등록 폼 */}
      <form className="task-create-form" onSubmit={handleSubmit}>
        {/* 업무 제목 */}
        <div className="form-group full-width">
          <label className="form-label required">업무 제목</label>
          <input
            type="text"
            name="taskTitle"
            placeholder="업무명 입력"
            value={formData.taskTitle}
            onChange={handleChange}
            className="form-input title-input"
            maxLength={200}
            required
          />
        </div>

        <div className="form-grid-row">
          {/* 주 담당자 선택 */}
          <div className="form-group">
            <label className="form-label">주 담당자</label>
            <select
              name="assignedMemberNo"
              value={formData.assignedMemberNo}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">담당자 미지정</option>
              {projectMembers.map((member) => (
                <option key={member.projectMemberNo} value={member.projectMemberNo}>
                  {member.empName} ({member.empDeptNo || "부서미정"} / {member.empPositionNo || "직급미정"})
                </option>
              ))}
            </select>
          </div>

          {/* 초기 진행 상태 */}
          <div className="form-group">
            <label className="form-label">초기 상태</label>
            <select
              name="taskStatus"
              value={formData.taskStatus}
              onChange={handleChange}
              className="form-select"
            >
              <option value="TODO">할 일 (To Do)</option>
              <option value="IN_PROGRESS">진행 중 (In Progress)</option>
              <option value="DONE">완료 (Done)</option>
            </select>
          </div>

          {/* 우선순위 */}
          <div className="form-group">
            <label className="form-label">우선순위</label>
            <select
              name="taskPriority"
              value={formData.taskPriority}
              onChange={handleChange}
              className="form-select"
            >
              <option value="낮음">낮음</option>
              <option value="보통">보통</option>
              <option value="높음">높음</option>
              <option value="긴급">긴급</option>
            </select>
          </div>

          {/* 카테고리 태그 */}
          <div className="form-group">
            <label className="form-label">업무 카테고리</label>
            <input
              type="text"
              name="taskCategory"
              placeholder="예: 백엔드, 기획, 디자인, 인프라"
              value={formData.taskCategory}
              onChange={handleChange}
              className="form-input"
              maxLength={50}
            />
          </div>
        </div>

        {/* 일정 영역 (taskProgress 슬라이더 제거) */}
        <div className="form-grid-row">
          <div className="form-group">
            <label className="form-label">시작 예정일</label>
            <input
              type="date"
              name="taskStart"
              value={formData.taskStart}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">마감 예정일</label>
            <input
              type="date"
              name="taskEnd"
              value={formData.taskEnd}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>

        {/* 협업자 다중 선택 */}
        <div className="form-group full-width">
          <label className="form-label">함께할 협업자 (다중 선택)</label>
          <div className="collab-chips-box">
            {loadingMembers ? (
              <span className="loading-text">멤버 목록을 불러오는 중...</span>
            ) : availableCollaboratorMembers.length === 0 ? (
              <span className="empty-text">선택 가능한 다른 멤버가 없습니다.</span>
            ) : (
              availableCollaboratorMembers.map((m) => {
                const isSelected = selectedCollaborators.includes(m.projectMemberNo);
                return (
                  <button
                    key={m.projectMemberNo}
                    type="button"
                    onClick={() => handleCollaboratorToggle(m.projectMemberNo)}
                    className={`collab-chip-btn ${isSelected ? "selected" : ""}`}
                  >
                    <span className="chip-avatar">{(m.empName || "사").slice(0, 1)}</span>
                    <span className="chip-name">{m.empName}</span>
                    {m.empDeptNo && <span className="chip-dept">({m.empDeptNo})</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 첨부파일 선택 섹션 */}
        <div className="form-group full-width">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label className="form-label" style={{ margin: 0 }}>첨부파일</label>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="btn-upload-file-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                fontSize: "12px",
                backgroundColor: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                cursor: "pointer",
                color: "#334155",
                fontWeight: "600"
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={13} />
              <span>파일 첨부하기</span>
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              backgroundColor: "#f8fafc",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              minHeight: "44px"
            }}
          >
            {selectedFiles.length === 0 ? (
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                첨부된 파일이 없습니다. 문서를 등록하려면 상단 버튼을 클릭하세요.
              </span>
            ) : (
              selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "6px 10px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                    <FileText size={14} style={{ color: "#64748b", flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontWeight: "600",
                        color: "#1e293b",
                        maxWidth: "360px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {file.name}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.name)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "2px"
                    }}
                    title="첨부 취소"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 업무 세부 내용 */}
        <div className="form-group full-width">
          <label className="form-label">업무 세부 내용</label>
          <textarea
            name="taskContent"
            placeholder="업무 목표, 상세 스펙, 체크리스트, 참고 링크 등을 자유롭게 작성하세요."
            value={formData.taskContent}
            onChange={handleChange}
            className="form-textarea"
            rows={7}
          />
        </div>

        {/* 하단 액션 버튼 */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            취소
          </button>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? "등록 중..." : "업무 생성 완료"}
          </button>
        </div>
      </form>
    </div>
  );
}