import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { useAtomValue } from "jotai";
import {
  Paperclip,
  Download,
  FileText,
  EyeOff,
  Check,
  X
} from "lucide-react";
import { apiClient } from "@utils/reaxios";
import { isLoginState } from "@utils/storage";
import "./Task.css";
import TaskComments from "./TaskComments";
import { getWebSocketClient, onWebSocketConnect } from "@utils/websocket";

const COLUMNS = [
  { id: "TODO", title: "To Do", colorClass: "col-todo" },
  { id: "IN_PROGRESS", title: "In Progress", colorClass: "col-progress" },
  { id: "DONE", title: "Done", colorClass: "col-done" }
];

export default function Task() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  //프로젝트 정보 받기-서준
  const { project } = useOutletContext();
  //종료여부
  const isClosed = project?.projectStatus === "closed";

  const isLogin = useAtomValue(isLoginState);

  const getDynamicLoginUser = () => {
    try {
      const keys = ["로그인 유저의 정보", "user", "loginUser"];
      for (const k of keys) {
        const item = localStorage.getItem(k);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && (parsed.empNo || parsed.memberNo)) return parsed;
        }
      }
    } catch (e) { }
    return null;
  };

  const loginUser = getDynamicLoginUser();
  //숨김 처리를 위한 현재 로그인한 사원번호
  const currentEmpNo = Number(loginUser?.empNo || loginUser?.memberNo || 0);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectMembers, setProjectMembers] = useState([]);

  //사번과 프로젝트 번호를 결합하여 개인별 키 생성
  const storageKey = `kanban_hidden_tasks_${currentEmpNo}_${projectNo}`;

  // 초기 렌더링 시 localStorage 에서 숨김 처리된 업무를 읽어옴
  const [hiddenTaskNos, setHiddenTaskNos] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });


  const [isHideMode, setIsHideMode] = useState(false);
  const [tempHiddenNos, setTempHiddenNos] = useState([]);

  //사원번호나 프로젝트 번호가 바뀔 때 동기화 실시
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setHiddenTaskNos(saved ? JSON.parse(saved) : []);
    } catch {
      setHiddenTaskNos([]);
    }
  }, [storageKey]);

  //근데 숨김만 되고 복구가 안됨
  /*
  // 개별 숨김 토글
  const handleToggleHidden = (taskNo, e) => {
    if (e) e.stopPropagation(); // 드로어 이벤트 차단

    setHiddenTaskNos((prev) => {
      const updated = prev.includes(taskNo)
      ? prev.filter((id) => id !== taskNo) // 이미 숨겨져 있으면 숨김 해제
      : [...prev, taskNo];                 // 아니면 숨김 목록에 추가
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };
  
  // 전체 복구
  const handleRestoreAll = () => {
    setHiddenTaskNos([]);
    localStorage.removeItem(storageKey);
  };
  */

  //숨김
  const handleEnterHideMode = () => {
    setTempHiddenNos([...hiddenTaskNos]);
    setIsHideMode(true);
  };

  const handleCheckTask = (taskNo, e) => {
    if (e) e.stopPropagation();
    setTempHiddenNos((prev) =>
      prev.includes(taskNo) ? prev.filter((id) => id !== taskNo) : [...prev, taskNo]
    );
  };

  const handleSaveHideSelection = () => {
    setHiddenTaskNos(tempHiddenNos);
    localStorage.setItem(storageKey, JSON.stringify(tempHiddenNos));
    setIsHideMode(false);
    toast.success("업무 숨김 설정이 적용되었습니다.");
  };

  //숨김 취소 처리
  const handleCancelHideMode = () => {
    setTempHiddenNos([]);
    setIsHideMode(false);
  };

  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [taskFiles, setTaskFiles] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    taskTitle: "",
    taskContent: "",
    assignedMemberNo: "",
    taskStatus: "TODO",
    taskPriority: "보통",
    taskCategory: "",
    taskStart: "",
    taskEnd: ""
  });
  const [editCollaborators, setEditCollaborators] = useState([]);
  const [updating, setUpdating] = useState(false);

  // 시작일과 마감일을 대조하여 D-Day 뱃지 정보 반환
  const getTaskDeadlineBadge = (task) => {
    if (!task.taskEnd) return null;

    if (task.taskStatus === "DONE") {
      return { text: "완료", className: "dday-done" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 시작일이 설정되어 있고 오늘보다 미래인 경우 뱃지 미노출
    if (task.taskStart) {
      const startDate = new Date(task.taskStart);
      startDate.setHours(0, 0, 0, 0);
      if (startDate.getTime() > today.getTime()) {
        return null;
      }
    }

    const endDate = new Date(task.taskEnd);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // 숫자 카운트(+N일)를 없애고 단일 뱃지로 노출
      return { text: "기한 초과", className: "dday-overdue" };
    } else if (diffDays === 0) {
      return { text: "오늘 마감", className: "dday-today" };
    } else if (diffDays <= 3) {
      return { text: `D-${diffDays}`, className: "dday-urgent" };
    } else {
      return { text: `D-${diffDays}`, className: "dday-normal" };
    }
  };

  const isImageAttach = (file) => {
    if (file.attachType && file.attachType.startsWith("image/")) return true;
    const name = file.attachName || "";
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name);
  };

  //첨부파일 확장자에 따라 다른 뱃지
  const getBadgeClass = (ext) => {
    if (["pdf"].includes(ext)) return "badge-pdf";
    if (["doc", "docx", "hwp", "hwpx", "txt"].includes(ext)) return "badge-doc";
    if (["xls", "xlsx", "csv"].includes(ext)) return "badge-xls";
    if (["ppt", "pptx"].includes(ext)) return "badge-ppt";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "badge-zip";
    return "";
  };

  const renderFileTypeBadge = (file) => {
    const name = file.attachName || "";
    const rawExt = name.includes(".") ? name.split(".").pop().trim() : "FILE";
    const extUpper = rawExt.toUpperCase();
    const extLower = rawExt.toLowerCase();

    return (
      <span className={`file-ext-badge ${getBadgeClass(extLower)}`}>
        {extUpper}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const fetchTasks = useCallback(async (pNo, showLoading = true) => {
    if (!pNo) return;
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get(`/task/list/${pNo}`);
      const taskList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setTasks(taskList);
    } catch (error) {
      console.error("조회 실패:", error);
      toast.error("업무 목록을 불러오지 못했습니다.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const fetchProjectMembers = useCallback(async (pNo) => {
    if (!pNo) return;
    try {
      const res = await apiClient.get(`/project/${pNo}/member`);
      const memberList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProjectMembers(memberList);
    } catch (error) {
      console.warn("프로젝트 멤버 목록 로딩 실패:", error);
    }
  }, []);

  const fetchTaskFiles = useCallback(async (taskNo) => {
    if (!taskNo) return;
    try {
      const res = await apiClient.get(`/task/file/${taskNo}`);
      const files = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setTaskFiles(files);
    } catch (error) {
      console.warn("업무 첨부파일 목록 조회 실패:", error);
      setTaskFiles([]);
    }
  }, []);

  useEffect(() => {
    if (projectNo) {
      fetchTasks(projectNo, true);
      fetchProjectMembers(projectNo);
    }
  }, [projectNo, fetchTasks, fetchProjectMembers]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedTask(null);
    setTaskFiles([]);
    setIsEditing(false);
  }, []);

  //웹소켓을 이용한 칸반변경 이벤트 실시간 수신 처리
  useEffect(() => {
    if (!projectNo) return;

    let subscription = null;
    let unregisterWebSocketConnect = null;

    const doSubscribe = (client) => {
      if (!client || !client.connected) return;

      subscription?.unsubscribe();

      subscription = client.subscribe(
        `/public/projects/${projectNo}/kanban`,
        (message) => {
          const event = JSON.parse(message.body);

          if (currentEmpNo > 0 && Number(event.senderEmpNo) === currentEmpNo) {
            return;
          }

          //업무 이동 시
          switch (event.eventType) {
            case "TASK_MOVED":
              setTasks((prev) =>
                prev.map((t) =>
                  t.taskNo === Number(event.taskNo)
                    ? { ...t, taskStatus: event.nextStatus }
                    : t
                )
              );
              setSelectedTask((prev) =>
                prev && prev.taskNo === Number(event.taskNo)
                  ? { ...prev, taskStatus: event.nextStatus }
                  : prev
              );
              break;

            //업무 생성 시
            case "TASK_CREATED":
              fetchTasks(projectNo, false);
              break;

            //업무 수정 시
            case "TASK_UPDATED":
              fetchTasks(projectNo, false);
              setSelectedTask((prev) => {
                if (prev && prev.taskNo === Number(event.taskNo)) {
                  apiClient.get(`/task/${event.taskNo}`).then((res) => {
                    if (res.data) setSelectedTask(res.data);
                  });
                }
                return prev;
              });
              break;
            
            //업무 삭제 시
            case "TASK_DELETED":
              fetchTasks(projectNo, false);
              setSelectedTask((prev) => {
                if (prev && prev.taskNo === Number(event.taskNo)) {
                  toast.info("현재 열람 중인 업무가 삭제되었습니다.");
                  handleCloseDrawer();
                }
                return prev;
              });
              break;


              //각종 댓글 이벤트 시
            case "COMMENT_ADDED":
            case "COMMENT_UPDATED":
            case "COMMENT_DELETED":
              window.dispatchEvent(
                new CustomEvent("task-comment-changed", {
                  detail: { taskNo: Number(event.taskNo) }
                })
              );
              break;

            default:
              break;
          }
        }
      );
    };

    const client = getWebSocketClient();
    if (client && client.connected) {
      doSubscribe(client);
    }

    unregisterWebSocketConnect = onWebSocketConnect(() => {
      const currentClient = getWebSocketClient();
      doSubscribe(currentClient);
    });

    return () => {
      subscription?.unsubscribe();
      if (typeof unregisterWebSocketConnect === "function") {
        unregisterWebSocketConnect();
      }
    };
  }, [projectNo, currentEmpNo, fetchTasks, handleCloseDrawer]);

  const getAssigneeName = (task) => {
    if (task.assignedMemberName && task.assignedMemberName.trim()) {
      return task.assignedMemberName;
    }
    if (task.assignedMemberNo) {
      const found = projectMembers.find((m) => m.projectMemberNo === Number(task.assignedMemberNo));
      if (found && found.empName) {
        return found.empName;
      }
    }
    return "미배정";
  };

  const currentAssignedNo = editFormData.assignedMemberNo
    ? Number(editFormData.assignedMemberNo)
    : null;

  const availableCollaboratorMembers = projectMembers.filter((m) => {
    if (currentAssignedNo && m.projectMemberNo === currentAssignedNo) return false;
    return !editCollaborators.includes(m.projectMemberNo);
  });

  const handleCardClick = async (taskNo) => {
    if (isDragging || isHideMode) return;
    setIsEditing(false);

    const localTarget = tasks.find((t) => t.taskNo === taskNo);
    if (localTarget) {
      setSelectedTask(localTarget);
      setDrawerOpen(true);
    }

    fetchTaskFiles(taskNo);

    try {
      setDrawerLoading(true);
      const res = await apiClient.get(`/task/${taskNo}`);
      if (res.data) {
        setSelectedTask(res.data);
      }
    } catch (error) {
      console.warn("단건 상세 로딩 실패:", error);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleStartEdit = () => {
    if (isClosed) {
      toast.warning("종료된 프로젝트의 업무는 수정 불가합니다.");
      return;
    }
    if (!selectedTask) return;

    setEditFormData({
      taskTitle: selectedTask.taskTitle || "",
      taskContent: selectedTask.taskContent || "",
      assignedMemberNo: selectedTask.assignedMemberNo || "",
      taskStatus: selectedTask.taskStatus || "TODO",
      taskPriority: selectedTask.taskPriority || "보통",
      taskCategory: selectedTask.taskCategory || "",
      taskStart: selectedTask.taskStart ? String(selectedTask.taskStart).slice(0, 10) : "",
      taskEnd: selectedTask.taskEnd ? String(selectedTask.taskEnd).slice(0, 10) : ""
    });

    const existingCollabNos = (selectedTask.collaborators || []).map(
      (c) => c.projectMemberNo
    );
    setEditCollaborators(existingCollabNos);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => {
      const nextForm = { ...prev, [name]: value };
      if (name === "assignedMemberNo" && value) {
        const selectedAssignedNo = Number(value);
        setEditCollaborators((collabs) =>
          collabs.filter((id) => id !== selectedAssignedNo)
        );
      }
      return nextForm;
    });
  };

  const handleCollabToggle = (memberNo) => {
    setEditCollaborators((prev) =>
      prev.includes(memberNo)
        ? prev.filter((id) => id !== memberNo)
        : [...prev, memberNo]
    );
  };

  const handleDeleteTaskFile = async (attachNo) => {
    if (isClosed) {
      toast.warning("종료된 프로젝트에서는 파일을 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm("이 첨부파일을 삭제하시겠습니까?")) return;
    try {
      await apiClient.delete(`/task/file/${selectedTask.taskNo}/${attachNo}`);
      toast.success("파일이 삭제되었습니다.");
      fetchTaskFiles(selectedTask.taskNo);
    } catch (error) {
      console.error("파일 삭제 실패:", error);
      toast.error("파일 삭제에 실패했습니다.");
    }
  };

  const handleUploadNewTaskFile = async (e) => {
    if (isClosed) {
      toast.warning("종료된 프로젝트에서는 파일을 추가할 수 없습니다.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiClient.post(
        `/task/file/${selectedTask.taskNo}?projectNo=${projectNo || 0}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success("새 첨부파일이 등록되었습니다.");
      fetchTaskFiles(selectedTask.taskNo);
      e.target.value = "";
    } catch (error) {
      console.error("파일 업로드 실패:", error);
      toast.error("파일 업로드에 실패했습니다.");
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();

    if (isClosed) {
      toast.warning("종료된 프로젝트의 업무는 수정할 수 없습니다.");
      return;
    }

    if (!editFormData.taskTitle.trim()) {
      toast.warn("업무 제목은 필수 입력 항목입니다.");
      return;
    }

    if (editFormData.taskStart && editFormData.taskEnd && editFormData.taskStart > editFormData.taskEnd) {
      toast.warn("마감일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    const payload = {
      taskNo: selectedTask.taskNo,
      projectNo: Number(projectNo),
      taskTitle: editFormData.taskTitle.trim(),
      taskContent: editFormData.taskContent ? editFormData.taskContent.trim() : null,
      assignedMemberNo:
        editFormData.assignedMemberNo && Number(editFormData.assignedMemberNo) > 0
          ? Number(editFormData.assignedMemberNo)
          : null,
      taskStatus: editFormData.taskStatus || "TODO",
      taskPriority: editFormData.taskPriority || "보통",
      taskCategory: editFormData.taskCategory ? editFormData.taskCategory.trim() : null,
      taskStart: editFormData.taskStart ? `${editFormData.taskStart} 00:00:00` : null,
      taskEnd: editFormData.taskEnd ? `${editFormData.taskEnd} 23:59:59` : null,
      collaboratorMemberNos: editCollaborators
    };

    try {
      setUpdating(true);
      await apiClient.put("/task/", payload);
      toast.success("업무 내용이 성공적으로 수정되었습니다.");

      const detailRes = await apiClient.get(`/task/${selectedTask.taskNo}`);
      if (detailRes.data) {
        setSelectedTask(detailRes.data);
      }
      fetchTasks(projectNo, false);
      setIsEditing(false);
    } catch (error) {
      console.error("업무 수정 실패:", error);
      toast.error("업무 수정에 실패했습니다.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDragStart = (e, taskNo) => {
    if (isHideMode) return;
    setIsDragging(true);
    setDraggedTaskId(taskNo);
    e.dataTransfer.setData("text/plain", String(taskNo));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      setIsDragging(false);
      setDraggedTaskId(null);
    }, 150);
  };

  const handleDragOver = (e, columnId) => {
    if (isHideMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== columnId) setDragOverCol(columnId);
  };

  const handleDragLeave = (e, columnId) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverCol === columnId) setDragOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    //드래그x
    if (isClosed || isHideMode) {
      return;
    }
    e.preventDefault();
    setDragOverCol(null);

    if (!draggedTaskId) {
      setIsDragging(false);
      return;
    }

    const targetTaskId = draggedTaskId;
    const targetTask = tasks.find((t) => t.taskNo === targetTaskId);

    setDraggedTaskId(null);
    setTimeout(() => setIsDragging(false), 150);

    if (!targetTask || targetTask.taskStatus === targetStatus) return;

    const backupTasks = [...tasks];

    setTasks((prev) =>
      prev.map((t) =>
        t.taskNo === targetTaskId ? { ...t, taskStatus: targetStatus } : t
      )
    );

    try {
      await apiClient.patch("/task/move", {
        taskNo: targetTaskId,
        targetStatus: targetStatus,
        projectNo: Number(projectNo)
      });
      toast.success(`[${getStatusLabel(targetStatus)}] 상태로 이동되었습니다.`);
    } catch (error) {
      console.error("이동 실패:", error);
      toast.error("이동에 실패하여 복구합니다.");
      setTasks(backupTasks);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "긴급": return "badge-urgent";
      case "높음": return "badge-high";
      case "낮음": return "badge-low";
      default: return "badge-normal";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "TODO": return "할 일 (To Do)";
      case "IN_PROGRESS": return "진행 중 (In Progress)";
      case "DONE": return "완료 (Done)";
      default: return status;
    }
  };

  if (loading) return <div className="kanban-loading">칸반 보드를 불러오는 중...</div>;



  //view
  return (
    <div className="custom-kanban-page">
      <div className="kanban-title-bar">
        <div className="kanban-title-text">
          <h2>프로젝트 #{projectNo} 업무 보드</h2>
          <p>
            {isHideMode
              ? "보드에서 숨길 업무를 선택한 후 [숨김 설정 완료]를 누르세요."
              : "카드를 드래그하여 상태를 변경하고, 클릭하여 상세 내역을 열람하세요."}
          </p>
        </div>

        <div className="kanban-top-actions">
          {isHideMode ? (
            <>
              <button
                type="button"
                className="btn-kanban-confirm"
                onClick={handleSaveHideSelection}
              >
                <Check size={14} /> 숨김 설정 완료 ({tempHiddenNos.length}개 숨김)
              </button>
              <button
                type="button"
                className="btn-kanban-cancel"
                onClick={handleCancelHideMode}
              >
                <X size={14} /> 취소
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-kanban-mode"
                onClick={handleEnterHideMode}
              >
                <EyeOff size={14} />
                업무 숨김/정리 모드
                {hiddenTaskNos.length > 0 && (
                  <span className="hidden-count-badge">{hiddenTaskNos.length}</span>
                )}
              </button>

              {isClosed === false && (
                <button
                  type="button"
                  className="btn-create-task"
                  onClick={() => navigate(`/projects/${projectNo}/taskInsert`)}
                >
                  <span className="plus-icon">+</span> 새 업무 등록
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="custom-kanban-board">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => {
            if ((t.taskStatus || "TODO") !== col.id) return false;
            if (isHideMode) return true;
            return !hiddenTaskNos.includes(t.taskNo);
          });

          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className={`kanban-column ${col.colorClass} ${isOver ? "drag-over" : ""}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="column-header">
                <span className="column-title">{col.title}</span>
                <span className="task-count-badge">{columnTasks.length}</span>
              </div>

              <div className="card-list-area">
                {columnTasks.length === 0 ? (
                  <div className="empty-dropzone">업무를 여기에 놓으세요</div>
                ) : (
                  columnTasks.map((task) => {
                    const isDraggingThis = draggedTaskId === task.taskNo;
                    const pClass = getPriorityBadge(task.taskPriority);
                    const assigneeName = getAssigneeName(task);
                    const ddayBadge = getTaskDeadlineBadge(task);
                    const isTaskHidden = isHideMode && tempHiddenNos.includes(task.taskNo);

                    return (
                      <div
                        key={task.taskNo}
                        draggable={!isClosed && !isHideMode}
                        onDragStart={(e) => handleDragStart(e, task.taskNo)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (isHideMode) {
                            handleCheckTask(task.taskNo);
                          } else {
                            handleCardClick(task.taskNo);
                          }
                        }}
                        className={`direct-task-card ${pClass} ${isDraggingThis ? "is-dragging" : ""} ${isTaskHidden ? "card-hide-target" : ""}`}
                      >
                        {isHideMode && (
                          <div className="card-hide-selector">
                            <input
                              type="checkbox"
                              checked={tempHiddenNos.includes(task.taskNo)}
                              onChange={(e) => handleCheckTask(task.taskNo, e)}
                              className="hide-checkbox"
                            />
                            <span className="hide-selector-label">
                              {tempHiddenNos.includes(task.taskNo) ? "숨김 대상" : "노출 유지"}
                            </span>
                          </div>
                        )}

                        <div className="card-top-info">
                          <span className="category-tag">#{task.taskCategory || "일반"}</span>

                          <span className={`priority-tag ${pClass}`}>
                            {task.taskPriority || "보통"}
                          </span>
                        </div>

                        <div className="card-main-title">{task.taskTitle}</div>

                        <div className="card-bottom-info">
                          <div className="assignee-info">
                            <span className="avatar-circle-sm">{assigneeName.slice(0, 1)}</span>
                            <span>{assigneeName}</span>
                          </div>

                          <div className="card-due-info">
                            {ddayBadge && (
                              <span className={`dday-badge ${ddayBadge.className}`}>
                                {ddayBadge.text}
                              </span>
                            )}
                            <span className="due-date-text">
                              {task.taskEnd ? String(task.taskEnd).slice(5, 10) : "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`drawer-backdrop ${drawerOpen ? "open" : ""}`} onClick={handleCloseDrawer} />

      <aside className={`task-drawer ${drawerOpen ? "open" : ""}`}>
        {drawerLoading && !selectedTask ? (
          <div className="drawer-loading">상세 정보를 불러오는 중...</div>
        ) : selectedTask ? (
          <div className="drawer-container">
            <div className="drawer-header">
              <div className="drawer-header-left">
                <span className="task-id-badge">TASK #{selectedTask.taskNo}</span>
                {!isEditing && (
                  <>
                    <span className={`priority-tag ${getPriorityBadge(selectedTask.taskPriority)}`}>
                      {selectedTask.taskPriority || "보통"}
                    </span>
                    <span className="task-status-pill">
                      {getStatusLabel(selectedTask.taskStatus)}
                    </span>
                  </>
                )}
                {isEditing && <span className="editing-badge">편집 중</span>}
              </div>
              <button className="drawer-close-btn" onClick={handleCloseDrawer}>
                ✕
              </button>
            </div>

            {!isEditing && (
              <>
                <div className="drawer-body view-mode">
                  <div className="view-title-section">
                    <span className="view-category-badge">#{selectedTask.taskCategory || "일반"}</span>
                    <h3 className="view-task-title">{selectedTask.taskTitle}</h3>
                  </div>

                  <div className="view-meta-grid">
                    <div className="meta-card-item">
                      <span className="meta-label">담당자</span>
                      <div className="meta-user-val">
                        <span className="meta-bold-val">
                          {getAssigneeName(selectedTask)}
                        </span>
                        {selectedTask.assignedMemberDept && (
                          <span className="meta-sub-val">({selectedTask.assignedMemberDept})</span>
                        )}
                      </div>
                    </div>

                    <div className="meta-card-item">
                      <span className="meta-label">작성자</span>
                      <span className="meta-bold-val">
                        {selectedTask.taskWriterName || "미입력"}
                      </span>
                    </div>

                    <div className="meta-card-item">
                      <span className="meta-label">시작일자</span>
                      <span className="meta-text-val">
                        {selectedTask.taskStart ? String(selectedTask.taskStart).slice(0, 10) : "미정"}
                      </span>
                    </div>

                    <div className="meta-card-item">
                      <span className="meta-label">마감일자</span>
                      <div className="meta-deadline-row">
                        <span className="meta-text-val">
                          {selectedTask.taskEnd ? String(selectedTask.taskEnd).slice(0, 10) : "미정"}
                        </span>
                        {(() => {
                          const badge = getTaskDeadlineBadge(selectedTask);
                          return badge ? (
                            <span className={`dday-badge ${badge.className}`}>
                              {badge.text}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="view-section">
                    <span className="section-title">
                      함께하는 협업자 (
                      {selectedTask.collaborators ? selectedTask.collaborators.length : 0}명)
                    </span>
                    <div className="collab-tag-list">
                      {selectedTask.collaborators && selectedTask.collaborators.length > 0 ? (
                        selectedTask.collaborators.map((c, idx) => (
                          <div key={idx} className="collab-chip">
                            <span className="chip-name">{c.memberName || `멤버 #${c.projectMemberNo}`}</span>
                            {c.deptName && <span className="chip-dept">({c.deptName})</span>}
                          </div>
                        ))
                      ) : (
                        <span className="empty-hint-text">지정된 협업자가 없습니다.</span>
                      )}
                    </div>
                  </div>

                  <div className="view-section">
                    <span className="section-title">업무 세부 내용</span>
                    <div className="view-content-box">
                      {selectedTask.taskContent || "등록된 상세 내용이 없습니다."}
                    </div>
                  </div>

                  <div className="view-section">
                    <span className="section-title">
                      <Paperclip size={13} className="inline-paperclip" />
                      업무 첨부파일 ({taskFiles.length}개)
                    </span>

                    <div className="task-file-list-box">
                      {taskFiles.length === 0 ? (
                        <span className="empty-hint-text">등록된 첨부파일이 없습니다.</span>
                      ) : (
                        <>
                          {taskFiles.some(isImageAttach) && (
                            <div className="task-img-gallery-grid">
                              {taskFiles.filter(isImageAttach).map((file) => {
                                const fileUrl = `http://localhost:8080/api/attach/${file.attachNo}`;
                                return (
                                  <div key={file.attachNo} className="task-img-thumbnail-item">
                                    <img
                                      src={fileUrl}
                                      alt={file.attachName}
                                      className="task-thumbnail-image"
                                      onClick={() => window.open(fileUrl, "_blank")}
                                      title={`${file.attachName} (클릭하여 확대)`}
                                    />
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="task-img-download-bar"
                                    >
                                      <Download size={11} /> 다운로드
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {taskFiles.filter((f) => !isImageAttach(f)).map((file) => (
                            <div key={file.attachNo} className="task-doc-item">
                              <div className="task-doc-info-wrap">
                                {renderFileTypeBadge(file)}
                                <span className="task-doc-name" title={file.attachName}>
                                  {file.attachName}
                                </span>
                                <span className="task-doc-size">
                                  ({formatFileSize(file.attachSize)})
                                </span>
                              </div>

                              <a
                                href={`http://localhost:8080/api/attach/${file.attachNo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-file-download"
                              >
                                <Download size={12} /> 다운로드
                              </a>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="view-timestamps">
                    <span>등록일시: {selectedTask.taskCtime ? String(selectedTask.taskCtime).replace("T", " ").slice(0, 19) : "-"}</span>
                    {selectedTask.taskUtime && (
                      <span>최종수정: {String(selectedTask.taskUtime).replace("T", " ").slice(0, 19)}</span>
                    )}
                  </div>

                  <TaskComments
                    taskNo={selectedTask.taskNo}
                    projectNo={projectNo}
                    loginUser={loginUser}
                    isClosed={isClosed}
                  />
                </div>

                <div className="drawer-footer">
                  <button className="btn-cancel" onClick={handleCloseDrawer}>
                    닫기
                  </button>
                  {isClosed === false && (
                    <button className="btn-edit-trigger" onClick={handleStartEdit}>
                      수정하기
                    </button>
                  )}
                </div>
              </>
            )}

            {isEditing && (
              <form className="drawer-edit-form" onSubmit={handleSaveEdit}>
                <div className="drawer-body edit-mode">
                  <div className="form-group full-width">
                    <label className="form-label required">업무 제목</label>
                    <input
                      type="text"
                      name="taskTitle"
                      value={editFormData.taskTitle}
                      onChange={handleEditChange}
                      className="form-input title-input"
                      maxLength={200}
                      required
                    />
                  </div>

                  <div className="form-grid-row">
                    <div className="form-group">
                      <label className="form-label">주 담당자</label>
                      <select
                        name="assignedMemberNo"
                        value={editFormData.assignedMemberNo}
                        onChange={handleEditChange}
                        className="form-select"
                      >
                        <option value="">담당자 미지정</option>
                        {projectMembers.map((m) => (
                          <option key={m.projectMemberNo} value={m.projectMemberNo}>
                            {m.empName} ({m.empDeptNo || "부서미정"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">진행 상태</label>
                      <select
                        name="taskStatus"
                        value={editFormData.taskStatus}
                        onChange={handleEditChange}
                        className="form-select"
                      >
                        <option value="TODO">할 일 (To Do)</option>
                        <option value="IN_PROGRESS">진행 중 (In Progress)</option>
                        <option value="DONE">완료 (Done)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">우선순위</label>
                      <select
                        name="taskPriority"
                        value={editFormData.taskPriority}
                        onChange={handleEditChange}
                        className="form-select"
                      >
                        <option value="낮음">낮음</option>
                        <option value="보통">보통</option>
                        <option value="높음">높음</option>
                        <option value="긴급">긴급</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">카테고리</label>
                      <input
                        type="text"
                        name="taskCategory"
                        value={editFormData.taskCategory}
                        onChange={handleEditChange}
                        placeholder="예: 백엔드, 프론트, 디자인"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-grid-row">
                    <div className="form-group">
                      <label className="form-label">시작일</label>
                      <input
                        type="date"
                        name="taskStart"
                        value={editFormData.taskStart}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">마감일</label>
                      <input
                        type="date"
                        name="taskEnd"
                        value={editFormData.taskEnd}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">
                      함께할 협업자 ({editCollaborators.length}명 선택됨)
                    </label>

                    <div className="collab-chips-box">
                      {editCollaborators.length === 0 ? (
                        <span className="collab-empty-text">
                          지정된 협업자가 없습니다. 아래에서 추가하세요.
                        </span>
                      ) : (
                        editCollaborators.map((memberNo) => {
                          const member = projectMembers.find((m) => m.projectMemberNo === memberNo);
                          if (!member) return null;
                          return (
                            <button
                              key={member.projectMemberNo}
                              type="button"
                              onClick={() => handleCollabToggle(member.projectMemberNo)}
                              className="collab-chip-btn selected"
                              title="클릭하여 협업자에서 제외"
                            >
                              <span className="chip-avatar">{(member.empName || "사").slice(0, 1)}</span>
                              <span className="chip-name">{member.empName}</span>
                              {member.empDeptNo && <span className="chip-dept">({member.empDeptNo})</span>}
                              <span className="chip-remove-mark">✕</span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <select
                      className="form-select"
                      value=""
                      onChange={(e) => {
                        const selectedNo = Number(e.target.value);
                        if (selectedNo) {
                          handleCollabToggle(selectedNo);
                        }
                      }}
                    >
                      <option value="">+ 협업할 사원 추가 선택</option>
                      {availableCollaboratorMembers.map((m) => (
                        <option key={m.projectMemberNo} value={m.projectMemberNo}>
                          {m.empName} ({m.empDeptNo || "부서미정"} / {m.projectMemberJob || "역할미정"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">업무 세부 내용</label>
                    <textarea
                      name="taskContent"
                      value={editFormData.taskContent}
                      onChange={handleEditChange}
                      className="form-textarea"
                      rows={5}
                    />
                  </div>

                  <div className="form-group full-width form-file-edit-wrap">
                    <div className="edit-file-top-bar">
                      <label className="form-label">업무 첨부파일 관리</label>
                      <label htmlFor="task-file-upload-input" className="btn-file-add-label">
                        <Paperclip size={12} /> 새 파일 추가
                      </label>
                      <input
                        id="task-file-upload-input"
                        type="file"
                        style={{ display: "none" }}
                        onChange={handleUploadNewTaskFile}
                      />
                    </div>

                    <div className="task-file-list-box">
                      {taskFiles.length === 0 ? (
                        <span className="empty-hint-text">등록된 첨부파일이 없습니다.</span>
                      ) : (
                        <>
                          {taskFiles.some(isImageAttach) && (
                            <div className="task-img-gallery-grid-sm">
                              {taskFiles.filter(isImageAttach).map((file) => (
                                <div key={file.attachNo} className="task-img-edit-card">
                                  <img
                                    src={`http://localhost:8080/api/attach/${file.attachNo}`}
                                    alt={file.attachName}
                                    className="task-thumbnail-image"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTaskFile(file.attachNo)}
                                    className="btn-attach-delete-circle"
                                    title="삭제"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {taskFiles.filter((f) => !isImageAttach(f)).map((file) => (
                            <div key={file.attachNo} className="task-doc-item">
                              <div className="task-doc-info-wrap">
                                {renderFileTypeBadge(file)}
                                <span className="task-doc-name" title={file.attachName}>
                                  {file.attachName}
                                </span>
                                <span className="task-doc-size">
                                  ({formatFileSize(file.attachSize)})
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteTaskFile(file.attachNo)}
                                className="btn-doc-delete-icon"
                                title="파일 삭제"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="drawer-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCancelEdit}
                    disabled={updating}
                  >
                    취소
                  </button>
                  <button type="submit" className="btn-save-edit" disabled={updating}>
                    {updating ? "저장 중..." : "수정 완료"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}