import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, CheckSquare, MessageSquare, ExternalLink } from "lucide-react";
import { apiClient } from "@utils/reaxios";
import { getWebSocketClient, onWebSocketConnect } from "@utils/websocket";
import "./NotificationCenter.css";

// 1. 안전한 사번(empNo) 추출 함수
function getLoginEmpNo() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      if (val && (val.includes("empNo") || val.includes("memberNo"))) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && (parsed.empNo || parsed.memberNo)) {
            return Number(parsed.empNo || parsed.memberNo);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  return Number(
    localStorage.getItem("empNo") ||
    sessionStorage.getItem("empNo") ||
    0
  );
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const myEmpNo = getLoginEmpNo();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // 2. NotificationRestController의 GET /api/notification/ 응답(Map) 파싱
  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get("/notification/");
      const data = res.data || {};

      let listData = [];
      if (Array.isArray(data)) {
        listData = data;
      } else if (Array.isArray(data.list)) {
        listData = data.list;
      } else if (Array.isArray(data.notifications)) {
        listData = data.notifications;
      } else if (Array.isArray(data.items)) {
        listData = data.items;
      } else if (Array.isArray(data.summary)) {
        listData = data.summary;
      }

      setNotifications(listData);

      let count = 0;
      if (typeof data.unreadCount === "number") {
        count = data.unreadCount;
      } else if (typeof data.count === "number") {
        count = data.count;
      } else {
        count = listData.filter(
          (item) => item.notificationRead === "N" || item.isRead === "N"
        ).length;
      }
      setUnreadCount(count);

    } catch (e) {
      console.error("알림 목록 조회 실패:", e);
    }
  }, []);

  // 3. 웹소켓 실시간 구독
  useEffect(() => {
    loadNotifications();

    if (!myEmpNo || myEmpNo <= 0) return;

    let subscription = null;

    const doSubscribe = (client) => {
      if (!client || !client.connected) return;

      subscription?.unsubscribe();
      subscription = client.subscribe(
        `/public/user/${myEmpNo}/notify`,
        (message) => {
          try {
            const newNoti = JSON.parse(message.body);
            setUnreadCount((prev) => prev + 1);
            setNotifications((prev) => [newNoti, ...prev]);
          } catch (err) {
            console.error("실시간 알림 파싱 실패:", err);
          }
        }
      );
    };

    const client = getWebSocketClient();
    if (client && client.connected) {
      doSubscribe(client);
    }

    const unregister = onWebSocketConnect(() => {
      const currentClient = getWebSocketClient();
      doSubscribe(currentClient);
    });

    return () => {
      subscription?.unsubscribe();
      if (typeof unregister === "function") unregister();
    };
  }, [myEmpNo, loadNotifications]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. 단건 읽음 처리 및 이동 (모든 업무 알림 드로어 오픈 보정 적용)
  const handleItemClick = async (item) => {
    const isUnread = item.notificationRead === "N" || item.isRead === "N";
    
    if (isUnread) {
      try {
        await apiClient.patch(`/notification/${item.notificationNo}/read`);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationNo === item.notificationNo
              ? { ...n, notificationRead: "Y", isRead: "Y" }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        console.error("단건 읽음 처리 실패:", e);
      }
    }

    setIsOpen(false);

    if (item.notificationUrl) {
      let targetUrl = item.notificationUrl;

      // 업무(TASK)와 관련된 모든 알림인 경우, 완료 알림과 동일하게 URL을 보정
      const isTaskNotification =
        item.notificationType?.includes("TASK") ||
        item.notificationUrl.includes("/task") ||
        item.notificationUrl.includes("/kanban");

      if (isTaskNotification) {
        // 1) targetTaskNo 추출 (notificationTarget 우선, 없으면 URL에서 taskNo 추출)
        let targetTaskNo = item.notificationTarget;
        if (!targetTaskNo) {
          const match = item.notificationUrl.match(/[?&]taskNo=(\d+)/) || item.notificationUrl.match(/\/task\/(\d+)/);
          if (match && match[1]) {
            targetTaskNo = match[1];
          }
        }

        // 2) projectNo 추출
        let targetProjectNo = item.projectNo;
        if (!targetProjectNo) {
          const pMatch = item.notificationUrl.match(/\/projects\/(\d+)/);
          if (pMatch && pMatch[1]) {
            targetProjectNo = pMatch[1];
          }
        }

        // 완료 처리 알림과 글자 하나 틀리지 않게 똑같은 규격으로 강제 조립
        if (targetProjectNo && targetTaskNo) {
          targetUrl = `/projects/${targetProjectNo}/task?taskNo=${targetTaskNo}`;
        }
      }

      navigate(targetUrl);
    }
  };

  // 5. 전체 읽음 처리 (PATCH /api/notification/read-all)
  const handleReadAll = async () => {
    try {
      await apiClient.patch("/notification/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, notificationRead: "Y", isRead: "Y" }))
      );
      setUnreadCount(0);
    } catch (e) {
      console.error("전체 읽음 처리 실패:", e);
    }
  };

  return (
    <div className="noti-center-container" ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      {/* 벨 아이콘 트리거 버튼 */}
      <button
        type="button"
        className="noti-bell-trigger"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) loadNotifications();
        }}
        title="알림"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "8px",
          display: "flex",
          alignItems: "center"
        }}
      >
        <Bell size={20} color="#334155" />
        {unreadCount > 0 && (
          <span
            className="noti-badge-count"
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              backgroundColor: "#ef4444",
              color: "#fff",
              fontSize: "11px",
              fontWeight: "bold",
              borderRadius: "10px",
              padding: "1px 5px",
              lineHeight: 1
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 패널 */}
      {isOpen && (
        <div
          className="noti-dropdown-panel"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            width: "360px",
            maxHeight: "460px",
            backgroundColor: "#fff",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: "1px solid #f1f5f9"
            }}
          >
            <div style={{ fontWeight: "bold", fontSize: "14px", color: "#1e293b" }}>
              알림 <span style={{ color: "#2563eb" }}>{unreadCount}</span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <CheckCheck size={14} /> 모두 읽음
              </button>
            )}
          </div>

          {/* 목록 */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: "13px" }}>
                도착한 새 알림이 없습니다.
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = item.notificationRead === "N" || item.isRead === "N";

                return (
                  <div
                    key={item.notificationNo}
                    onClick={() => handleItemClick(item)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "12px 16px",
                      borderBottom: "1px solid #f8fafc",
                      backgroundColor: isUnread ? "#f0f7ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "background 0.15s"
                    }}
                  >
                    <div
                      style={{
                        padding: "6px",
                        borderRadius: "6px",
                        backgroundColor: "#e0e7ff",
                        color: "#4338ca",
                        marginTop: "2px"
                      }}
                    >
                      {item.notificationType?.includes("TASK") ? (
                        <CheckSquare size={16} />
                      ) : (
                        <MessageSquare size={16} />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: isUnread ? "700" : "500",
                          color: "#1e293b",
                          lineHeight: "1.4"
                        }}
                      >
                        {item.notificationContent}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                        {item.notificationCtime
                          ? String(item.notificationCtime).replace("T", " ").slice(0, 16)
                          : ""}
                      </div>
                    </div>

                    <ExternalLink size={14} color="#cbd5e1" style={{ marginTop: "4px" }} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}