import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { useAtomValue } from "jotai";
import {
  MoreVertical,
  Plus,
  Trash2,
  RotateCcw,
  EyeOff,
  Download,
  Paperclip,
  Undo2,
  X,
  Search
} from "lucide-react";
import { apiClient } from "@utils/reaxios";
import { isLoginState } from "@utils/storage";
import "./Task.css";
import TaskComments from "./TaskComments";
import { getWebSocketClient, onWebSocketConnect } from "@utils/websocket";
import Swal from "sweetalert2";

const COLUMNS = [
  { id: "TODO", title: "To Do", colorClass: "col-todo" },
  { id: "IN_PROGRESS", title: "In Progress", colorClass: "col-progress" },
  { id: "DONE", title: "Done", colorClass: "col-done" }
];

export default function Task() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const { project } = useOutletContext();
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
  const currentEmpNo = Number(loginUser?.empNo || loginUser?.memberNo || 0);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectMembers, setProjectMembers] = useState([]);

  // 실시간 업무 검색 키워드 상태
  const [searchKeyword, setSearchKeyword] = useState("");

  // 상단 업무 관리 드롭다운 메뉴 상태
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 업무 로컬 숨김 상태 관리
  const storageKey = `kanban_hidden_tasks_${currentEmpNo}_${projectNo}`;
  const [hiddenTaskNos, setHiddenTaskNos] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setHiddenTaskNos(saved ? JSON.parse(saved) : []);
    } catch {
      setHiddenTaskNos([]);
    }
  }, [storageKey]);

  const handleToggleHideTask = (taskNo, e) => {
    if (e) e.stopPropagation();
    setHiddenTaskNos((prev) => {
      const updated = prev.includes(taskNo)
        ? prev.filter((id) => id !== taskNo)
        : [...prev, taskNo];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // 숨긴 업무 복구 모달 상태
  const [hiddenModalOpen, setHiddenModalOpen] = useState(false);
  const [selectedRestoreNos, setSelectedRestoreNos] = useState([]);

  const hiddenTaskList = tasks.filter((t) => hiddenTaskNos.includes(t.taskNo));

  const handleOpenHiddenModal = () => {
    setSelectedRestoreNos([...hiddenTaskNos]);
    setHiddenModalOpen(true);
  };

  const handleToggleRestoreCheck = (taskNo) => {
    setSelectedRestoreNos((prev) =>
      prev.includes(taskNo) ? prev.filter((id) => id !== taskNo) : [...prev, taskNo]
    );
  };

  const handleToggleAllRestoreCheck = () => {
    if (selectedRestoreNos.length === hiddenTaskNos.length) {
      setSelectedRestoreNos([]);
    } else {
      setSelectedRestoreNos([...hiddenTaskNos]);
    }
  };

  const handleConfirmRestoreSelected = () => {
    if (selectedRestoreNos.length === 0) {
      toast.warn("복구할 업무를 1개 이상 선택해주세요.");
      return;
    }

    setHiddenTaskNos((prev) => {
      const updated = prev.filter((id) => !selectedRestoreNos.includes(id));
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    toast.success(`${selectedRestoreNos.length}개의 업무가 보드로 복구되었습니다.`);
    setSelectedRestoreNos([]);
    setHiddenModalOpen(false);
  };

  const handleRestoreSingleTask = (taskNo) => {
    setHiddenTaskNos((prev) => {
      const updated = prev.filter((id) => id !== taskNo);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
    setSelectedRestoreNos((prev) => prev.filter((id) => id !== taskNo));
    toast.success("업무가 보드로 복구되었습니다.");
  };

  // 드래그 앤 드롭 상태
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // 드로어 상태
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [taskFiles, setTaskFiles] = useState([]);

  // 수정 모드 상태
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

  // 휴지통 모달 상태
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const getTaskDeadlineBadge = (task) => {
    if (!task.taskEnd) return null;
    if (task.taskStatus === "DONE") {
      return { text: "완료", className: "dday-done" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

  const renderFileTypeBadge = (file) => {
    const name = file.attachName || "";
    const rawExt = name.includes(".") ? name.split(".").pop().trim() : "FILE";
    const extUpper = rawExt.toUpperCase();
    const extLower = rawExt.toLowerCase();

    let bgColor = "#f1f5f9";
    let textColor = "#475569";

    if (["pdf"].includes(extLower)) {
      bgColor = "#fee2e2";
      textColor = "#dc2626";
    } else if (["doc", "docx", "hwp", "hwpx", "txt"].includes(extLower)) {
      bgColor = "#e0e7ff";
      textColor = "#4338ca";
    } else if (["xls", "xlsx", "csv"].includes(extLower)) {
      bgColor = "#dcfce7";
      textColor = "#15803d";
    } else if (["ppt", "pptx"].includes(extLower)) {
      bgColor = "#ffedd5";
      textColor = "#ea580c";
    } else if (["zip", "rar", "7z", "tar", "gz"].includes(extLower)) {
      bgColor = "#fef3c7";
      textColor = "#d97706";
    }

    return (
      <span
        style={{
          backgroundColor: bgColor,
          color: textColor,
          padding: "2px 6px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: "bold",
          letterSpacing: "0.02em",
          flexShrink: 0
        }}
      >
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
      console.error("업무 목록 조회 실패:", error);
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

  const fetchDeletedTasks = useCallback(async () => {
    if (!projectNo) return;
    try {
      setTrashLoading(true);
      const res = await apiClient.get(`/task/deleted/${projectNo}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setDeletedTasks(list);
    } catch (error) {
      console.error("휴지통 조회 실패:", error);
      toast.error("삭제된 업무 목록을 가져오지 못했습니다.");
    } finally {
      setTrashLoading(false);
    }
  }, [projectNo]);

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

            case "TASK_CREATED":
            case "TASK_RESTORED":
              fetchTasks(projectNo, false);
              break;

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

            case "TASK_DELETED":
              fetchTasks(projectNo, false);
              setSelectedTask((prev) => {
                if (prev && prev.taskNo === Number(event.taskNo)) {
                  handleCloseDrawer();
                }
                return prev;
              });
              break;

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
    if (isDragging) return;
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

  const handleDeleteTask = async () => {
    if (isClosed) {
      toast.warning("종료된 프로젝트의 업무는 삭제할 수 없습니다.");
      return;
    }
    if (!selectedTask) return;

    const result = await Swal.fire({
      title: "업무를 삭제하시겠습니까?",
      html: `<strong>"${selectedTask.taskTitle}"</strong> 업무가 휴지통으로 이동됩니다.`,
      icon: "warning",
      showCancelButton: true,
      confirmBUttonColor: "#e11d48",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "삭제",
      cancelButtonText: "취소",
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(`/task/${selectedTask.taskNo}?projectNo=${projectNo}`);
      toast.success("업무가 삭제(휴지통 이동)되었습니다.");

      const deletedTaskNo = selectedTask.taskNo;
      handleCloseDrawer();

      setTasks((prev) => prev.filter((t) => t.taskNo !== deletedTaskNo));
    } catch (error) {
      console.error("업무 삭제 실패:", error);
      toast.error("업무 삭제에 실패했습니다.");
    }
  };

  const handleRestoreTask = async (taskNo) => {
    try {
      await apiClient.patch(`/task/${taskNo}/restore?projectNo=${projectNo}`);
      toast.success("업무가 정상 복구되었습니다.");

      setDeletedTasks((prev) => prev.filter((t) => t.taskNo !== taskNo));
      fetchTasks(projectNo, false);
    } catch (error) {
      console.error("업무 복구 실패:", error);
      toast.error("업무 복구에 실패했습니다.");
    }
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
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== columnId) setDragOverCol(columnId);
  };

  const handleDragLeave = (e, columnId) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverCol === columnId) setDragOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    if (isClosed) return;
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

  return (
    <div className="custom-kanban-page">
      {/* 상단 타이틀 바 */}
      <div className="kanban-title-bar">
        <div className="kanban-title-text">
          <h2>프로젝트 #{projectNo} 업무 보드</h2>
          <p>카드를 드래그하여 상태를 변경하고, 클릭하여 상세 내역을 열람하세요.</p>
        </div>

        {/* 우측 상단 액션 그룹 */}
        <div className="kanban-top-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* 실시간 업무 검색 입력창 */}
          <div className="kanban-search-box">
            <Search size={14} className="kanban-search-icon" />
            <input
              type="text"
              placeholder="업무, 내용, 담당자 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="kanban-search-input"
            />
            {searchKeyword && (
              <button
                type="button"
                className="kanban-search-clear"
                onClick={() => setSearchKeyword("")}
                title="검색어 초기화"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* 업무 관리 드롭다운 메뉴 */}
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              type="button"
              className="btn-kanban-menu-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
            >
              <span>업무 관리</span>
              {hiddenTaskNos.length > 0 && <span className="menu-active-dot" />}
              <MoreVertical size={16} color="#64748b" />
            </button>

            {menuOpen && (
              <div className="kanban-dropdown-menu">
                {!isClosed && (
                  <button
                    type="button"
                    className="dropdown-item-btn item-primary"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(`/projects/${projectNo}/taskInsert`);
                    }}
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    새 업무 등록
                  </button>
                )}

                <button
                  type="button"
                  className="dropdown-item-btn item-default"
                  disabled={hiddenTaskNos.length === 0}
                  onClick={() => {
                    setMenuOpen(false);
                    handleOpenHiddenModal();
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <RotateCcw size={14} />
                    숨긴 업무 복구
                  </span>
                  {hiddenTaskNos.length > 0 && (
                    <span className="dropdown-item-badge">
                      {hiddenTaskNos.length}
                    </span>
                  )}
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item-btn item-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    fetchDeletedTasks();
                    setTrashModalOpen(true);
                  }}
                >
                  <Trash2 size={14} />
                  휴지통 (삭제된 업무)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3단 칸반 보드 영역 */}
      <div className="custom-kanban-board">
        {COLUMNS.map((col) => {
          const trimmedKeyword = searchKeyword.trim().toLowerCase();

          const columnTasks = tasks.filter((t) => {
            const isCorrectCol = (t.taskStatus || "TODO") === col.id;
            const isNotHidden = !hiddenTaskNos.includes(t.taskNo);
            if (!isCorrectCol || !isNotHidden) return false;

            if (!trimmedKeyword) return true;

            const title = (t.taskTitle || "").toLowerCase();
            const content = (t.taskContent || "").toLowerCase();
            const category = (t.taskCategory || "").toLowerCase();
            const assignee = getAssigneeName(t).toLowerCase();

            return (
              title.includes(trimmedKeyword) ||
              content.includes(trimmedKeyword) ||
              category.includes(trimmedKeyword) ||
              assignee.includes(trimmedKeyword)
            );
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

                    return (
                      <div
                        key={task.taskNo}
                        draggable={!isClosed}
                        onDragStart={(e) => handleDragStart(e, task.taskNo)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleCardClick(task.taskNo)}
                        className={`direct-task-card ${pClass} ${isDraggingThis ? "is-dragging" : ""}`}
                      >
                        <div className="card-top-info">
                          <span className="category-tag">#{task.taskCategory || "일반"}</span>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className={`priority-tag ${pClass}`}>
                              {task.taskPriority || "보통"}
                            </span>

                            <button
                              type="button"
                              className="btn-hide-task"
                              title="보드에서 숨기기"
                              onClick={(e) => handleToggleHideTask(task.taskNo, e)}
                            >
                              <EyeOff size={17} strokeWidth={2.2} />
                            </button>
                          </div>
                        </div>

                        <div className="card-main-title">{task.taskTitle}</div>

                        <div className="card-bottom-info">
                          <div className="assignee-info">
                            <span className="avatar-circle-sm">{assigneeName.slice(0, 1)}</span>
                            <span>{assigneeName}</span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

      {/* 숨긴 업무 체크박스 복구 모달 */}
      {hiddenModalOpen && (
        <div className="modal-overlay" onClick={() => setHiddenModalOpen(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <RotateCcw size={18} color="#2563eb" />
                <span className="modal-title-text">숨긴 업무 복구</span>
                <span className="modal-count-badge primary">총 {hiddenTaskNos.length}개</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setHiddenModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {hiddenTaskNos.length > 0 && (
              <div className="modal-check-toolbar">
                <label className="modal-check-label">
                  <input
                    type="checkbox"
                    checked={selectedRestoreNos.length === hiddenTaskNos.length && hiddenTaskNos.length > 0}
                    onChange={handleToggleAllRestoreCheck}
                    style={{ width: "15px", height: "15px", cursor: "pointer" }}
                  />
                  전체 선택 ({selectedRestoreNos.length}/{hiddenTaskNos.length})
                </label>
                <span className="modal-hint-text">체크된 카드가 보드로 복구됩니다</span>
              </div>
            )}

            <div className="modal-body-list">
              {hiddenTaskList.length === 0 ? (
                <div className="modal-empty-state">숨겨진 업무가 없습니다.</div>
              ) : (
                hiddenTaskList.map((task) => {
                  const isChecked = selectedRestoreNos.includes(task.taskNo);

                  return (
                    <div
                      key={task.taskNo}
                      className={`modal-item-card ${isChecked ? "is-checked" : ""}`}
                      onClick={() => handleToggleRestoreCheck(task.taskNo)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="modal-item-left">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRestoreCheck(task.taskNo)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        <div>
                          <div className="modal-item-meta">
                            <span className="modal-meta-category">#{task.taskCategory || "일반"}</span>
                            <span className="modal-meta-status">{task.taskStatus}</span>
                          </div>
                          <div className="modal-item-title">{task.taskTitle}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-modal-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreSingleTask(task.taskNo);
                        }}
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setHiddenModalOpen(false)}
              >
                닫기
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                disabled={selectedRestoreNos.length === 0}
                onClick={handleConfirmRestoreSelected}
              >
                선택한 {selectedRestoreNos.length}개 업무 복구
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 휴지통 모달 */}
      {trashModalOpen && (
        <div className="modal-overlay" onClick={() => setTrashModalOpen(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Trash2 size={18} color="#e11d48" />
                <span className="modal-title-text">휴지통 (삭제된 업무)</span>
                <span className="modal-count-badge danger">{deletedTasks.length}</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setTrashModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-list">
              {trashLoading ? (
                <div className="modal-empty-state">휴지통 목록을 불러오는 중...</div>
              ) : deletedTasks.length === 0 ? (
                <div className="modal-empty-state">삭제된 업무가 없습니다.</div>
              ) : (
                deletedTasks.map((dTask) => (
                  <div key={dTask.taskNo} className="modal-item-card" style={{ backgroundColor: "#f8fafc" }}>
                    <div>
                      <div className="modal-item-meta">
                        <span className="modal-meta-category">#{dTask.taskCategory || "일반"}</span>
                        <span className="modal-meta-status">{dTask.taskStatus}</span>
                      </div>
                      <div className="modal-item-title">{dTask.taskTitle}</div>
                      <div className="modal-item-subtext">
                        삭제일시: {dTask.taskUtime ? String(dTask.taskUtime).replace("T", " ").slice(0, 16) : "-"}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-modal-action"
                      onClick={() => handleRestoreTask(dTask.taskNo)}
                    >
                      <Undo2 size={13} />
                      복구
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setTrashModalOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 업무 상세 드로어 */}
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

            {/* 열람 모드 */}
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
                        <span className="meta-bold-val">{getAssigneeName(selectedTask)}</span>
                        {selectedTask.assignedMemberDept && (
                          <span className="meta-sub-val">({selectedTask.assignedMemberDept})</span>
                        )}
                      </div>
                    </div>

                    <div className="meta-card-item">
                      <span className="meta-label">작성자</span>
                      <span className="meta-bold-val">{selectedTask.taskWriterName || "미입력"}</span>
                    </div>

                    <div className="meta-card-item">
                      <span className="meta-label">시작일자</span>
                      <span className="meta-text-val">
                        {selectedTask.taskStart ? String(selectedTask.taskStart).slice(0, 10) : "미정"}
                      </span>
                    </div>

                    <div className="meta-card-item">
                      <span className="meta-label">마감일자</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                      함께하는 협업자 ({selectedTask.collaborators ? selectedTask.collaborators.length : 0}명)
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
                      <Paperclip size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
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
                                  <div key={file.attachNo} className="task-img-card">
                                    <img
                                      src={fileUrl}
                                      alt={file.attachName}
                                      className="task-img-element"
                                      onClick={() => window.open(fileUrl, "_blank")}
                                      title={`${file.attachName} (클릭하여 확대)`}
                                    />
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="task-img-download-overlay"
                                    >
                                      <Download size={11} style={{ marginRight: "2px" }} /> 다운로드
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {taskFiles.filter((f) => !isImageAttach(f)).map((file) => (
                            <div key={file.attachNo} className="task-doc-row">
                              <div className="task-doc-info">
                                {renderFileTypeBadge(file)}
                                <span className="task-doc-title" title={file.attachName}>
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
                  <div>
                    {isClosed === false && (
                      <button
                        type="button"
                        className="btn-drawer-delete"
                        onClick={handleDeleteTask}
                      >
                        <Trash2 size={13} />
                        업무 삭제
                      </button>
                    )}
                  </div>
                  <div className="drawer-footer-right">
                    <button className="btn-cancel" onClick={handleCloseDrawer}>
                      닫기
                    </button>
                    {isClosed === false && (
                      <button className="btn-edit-trigger" onClick={handleStartEdit}>
                        수정하기
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 수정 모드 */}
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
                        <span className="empty-hint-text">
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
                              className="collab-chip-btn"
                              title="클릭하여 협업자에서 제외"
                            >
                              <span className="chip-avatar">{(member.empName || "사").slice(0, 1)}</span>
                              <span className="chip-name">{member.empName}</span>
                              {member.empDeptNo && <span className="chip-dept">({member.empDeptNo})</span>}
                              <span className="chip-remove-x">✕</span>
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

                  <div className="form-group full-width" style={{ marginTop: "10px" }}>
                    <div className="edit-file-header">
                      <label className="form-label" style={{ margin: 0 }}>업무 첨부파일 관리</label>
                      <label htmlFor="task-file-upload-input" className="btn-file-upload-label">
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
                                <div key={file.attachNo} className="task-img-card">
                                  <img
                                    src={`http://localhost:8080/api/attach/${file.attachNo}`}
                                    alt={file.attachName}
                                    className="task-img-element"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTaskFile(file.attachNo)}
                                    className="btn-img-delete"
                                    title="삭제"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {taskFiles.filter((f) => !isImageAttach(f)).map((file) => (
                            <div key={file.attachNo} className="task-doc-row">
                              <div className="task-doc-info">
                                {renderFileTypeBadge(file)}
                                <span className="task-doc-title" title={file.attachName}>
                                  {file.attachName}
                                </span>
                                <span className="task-doc-size">
                                  ({formatFileSize(file.attachSize)})
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteTaskFile(file.attachNo)}
                                className="btn-doc-delete"
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

                <div className="drawer-footer" style={{ justifyContent: "flex-end" }}>
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