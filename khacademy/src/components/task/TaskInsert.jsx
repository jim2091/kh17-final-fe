import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";
import "./TaskInsert.css";

export default function TaskInsert() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  // 프로젝트 참여 멤버 목록 (담당자 & 협업자 선택용)
  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 폼 입력 상태
  const [formData, setFormData] = useState({
    taskTitle: "",
    taskContent: "",
    assignedMemberNo: "",
    taskStatus: "TODO",
    taskPriority: "낮음",
    taskCategory: "",
    taskProgress: 0,
    taskStart: "",
    taskEnd: ""
  });

  // 다중 협업자 선택 상태 (projectMemberNo 배열)
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);

  // 1. 프로젝트 참여 멤버 목록 조회
  useEffect(() => {
    if (projectNo) {
      findProjectMembers(projectNo);
    }
  }, [projectNo]);

  const findProjectMembers = async (pNo) => {
    try {
      setLoadingMembers(true);
      // 프로젝트 멤버 목록 API 호출
      const res = await apiClient.get(`/project/${pNo}/members`);
      setProjectMembers(res.data || []);
    } catch (error) {
      console.warn("프로젝트 멤버 목록 로딩 실패:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // 폼 필드 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // 협업자 다중 토글 핸들러
  const handleCollaboratorToggle = (memberNo) => {
    setSelectedCollaborators((prev) =>
      prev.includes(memberNo)
        ? prev.filter((id) => id !== memberNo)
        : [...prev, memberNo]
    );
  };

  // 업무 등록 제출
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 필수 항목 검증 (업무 제목)
    if (!formData.taskTitle.trim()) {
      toast.warn("업무 제목은 필수 입력 항목입니다.");
      return;
    }

    // 시작일/마감일 유효성 검증
    if (formData.taskStart && formData.taskEnd && formData.taskStart > formData.taskEnd) {
      toast.warn("마감일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    // 서버 전송용 Payload 구성 (선택 항목은 null 처리)
    const payload = {
      projectNo: Number(projectNo),
      taskTitle: formData.taskTitle.trim(),
      taskContent: formData.taskContent ? formData.taskContent.trim() : null,
      assignedMemberNo: formData.assignedMemberNo ? Number(formData.assignedMemberNo) : null,
      taskStatus: formData.taskStatus || "TODO",
      taskPriority: formData.taskPriority || "보통",
      taskCategory: formData.taskCategory ? formData.taskCategory.trim() : null,
      taskProgress: Number(formData.taskProgress) || 0,
      taskStart: formData.taskStart ? `${formData.taskStart} 00:00:00` : null,
      taskEnd: formData.taskEnd ? `${formData.taskEnd} 23:59:59` : null,
      collaboratorMemberNos: selectedCollaborators
    };

    try {
      setSubmitting(true);
      await apiClient.post("/task/", payload);
      toast.success("신규 업무가 성공적으로 등록되었습니다.");
      navigate(`/project/${projectNo}/task`); // 보드 화면으로 이동
    } catch (error) {
      console.error("업무 등록 실패:", error);
      toast.error("업무 등록에 실패했습니다. 입력값을 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

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
        {/* 업무 제목 (필수) */}
        <div className="form-group full-width">
          <label className="form-label required">업무 제목</label>
          <input
            type="text"
            name="taskTitle"
            placeholder="어떤 업무인가요? (예: 그룹웨어 DB 스키마 설계 및 검증)"
            value={formData.taskTitle}
            onChange={handleChange}
            className="form-input title-input"
            maxLength={200}
            required
          />
        </div>

        {/* 2열 메타 정보 영역 */}
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

        {/* 일정 및 진척도 영역 */}
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

          <div className="form-group full-width-sm">
            <div className="label-with-val">
              <label className="form-label">초기 진척도</label>
              <span className="progress-num-badge">{formData.taskProgress}%</span>
            </div>
            <input
              type="range"
              name="taskProgress"
              min="0"
              max="100"
              step="5"
              value={formData.taskProgress}
              onChange={handleChange}
              className="form-range"
            />
          </div>
        </div>

        {/* 협업자 다중 선택 (칩 버튼 형태) */}
        <div className="form-group full-width">
          <label className="form-label">함께할 협업자 (다중 선택)</label>
          <div className="collab-chips-box">
            {loadingMembers ? (
              <span className="loading-text">멤버 목록을 불러오는 중...</span>
            ) : projectMembers.length === 0 ? (
              <span className="empty-text">프로젝트에 등록된 다른 멤버가 없습니다.</span>
            ) : (
              projectMembers.map((m) => {
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