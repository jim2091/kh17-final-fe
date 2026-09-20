import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Table, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { apiClient } from "../../utils/reaxios";
import "./NotificationsPage.css";
import ProjectInviteModal from "../project/ProjectInviteModal";

// 알림 카테고리 정의 (분류 필터, 라벨, URL 이동에서 공통으로 사용)
const CATEGORY_META = {
    SCHEDULE: { label: "일정", badgeClass: "bg-info" },
    TASK: { label: "업무", badgeClass: "bg-success" },
    NOTE: { label: "노트", badgeClass: "bg-warning" },
    PROJECT: { label: "프로젝트", badgeClass: "bg-primary" },
    ETC: { label: "기타", badgeClass: "bg-secondary" }
};

// 알림 1건에 대한 카테고리 판별 (notificationType 우선, 없으면 URL 패턴으로 추정)
// -> 라벨 표시, URL 이동, 필터링에서 모두 이 함수 하나만 사용해서 로직 불일치를 방지
function getNotificationCategory(item) {
    const type = item?.notificationType || "";
    const url = item?.notificationUrl || "";

    if (type.includes("SCHEDULE") || url.includes("/calendar") || url.includes("/schedule")) {
        return "SCHEDULE";
    }
    if (type.includes("TASK") || url.includes("/task")) {
        return "TASK";
    }
    if (type.includes("NOTE") || url.includes("/note")) {
        return "NOTE";
    }
    if (type.toLowerCase().includes("project") || url.match(/\/projects\/\d+\/?$/)) {
        return "PROJECT";
    }
    return "ETC";
}

function getNotificationTypeLabel(category) {
    return CATEGORY_META[category]?.label || "기타";
}

function getNotificationBadgeClass(category) {
    return CATEGORY_META[category]?.badgeClass || "bg-secondary";
}

function resolveNotificationTargetUrl(item) {
    if (!item?.notificationUrl) return null;

    const category = getNotificationCategory(item);
    let targetUrl = item.notificationUrl;

    let targetProjectNo = item.projectNo;
    if (!targetProjectNo) {
        const pMatch = item.notificationUrl.match(/\/projects\/(\d+)/);
        if (pMatch && pMatch[1]) targetProjectNo = pMatch[1];
    }

    if (category === "SCHEDULE") {
        let targetScheduleNo = item.notificationTarget;
        if (!targetScheduleNo) {
            const match =
                item.notificationUrl.match(/[?&]scheduleNo=(\d+)/) ||
                item.notificationUrl.match(/\/\/(\d+)/);
            if (match && match[1]) targetScheduleNo = match[1];
        }

        if (targetProjectNo && targetScheduleNo) {
            targetUrl = `/projects/${targetProjectNo}/calendar?scheduleNo=${targetScheduleNo}`;
        } else if (targetProjectNo) {
            targetUrl = `/projects/${targetProjectNo}/calendar`;
        }
    } else if (category === "TASK") {
        let targetTaskNo = item.notificationTarget;
        if (!targetTaskNo) {
            const match =
                item.notificationUrl.match(/[?&]taskNo=(\d+)/) ||
                item.notificationUrl.match(/\/task\/(\d+)/);
            if (match && match[1]) targetTaskNo = match[1];
        }

        if (targetProjectNo && targetTaskNo) {
            targetUrl = `/projects/${targetProjectNo}/task?taskNo=${targetTaskNo}`;
        }
    } else if (category === "NOTE") {
        // 기존에는 isNoteNotification이 선언 없이 쓰여서(버그) 노트 알림 이동이 정상 동작하지 않았음
        let targetNoteNo = item.notificationTarget;
        if (!targetNoteNo) {
            const match =
                item.notificationUrl.match(/[?&]noteNo=(\d+)/) ||
                item.notificationUrl.match(/\/note\/(\d+)/);
            if (match && match[1]) targetNoteNo = match[1];
        }

        if (targetProjectNo && targetNoteNo) {
            targetUrl = `/projects/${targetProjectNo}/note/${targetNoteNo}`;
        }
    } else if (category === "PROJECT" && targetProjectNo) {
        targetUrl = `/projects/${targetProjectNo}`;
    }

    return targetUrl;
}

function isNotificationUnread(item) {
    return item.notificationRead === "N" || item.isRead === "N";
}

// 분류 필터 버튼에 표시할 목록 (순서 고정)
const CATEGORY_FILTERS = [
    { value: "all", label: "전체" },
    { value: "PROJECT", label: "프로젝트" },
    { value: "NOTE", label: "노트" },
    { value: "TASK", label: "업무" },
    { value: "SCHEDULE", label: "일정" }
];

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notificationList, setNotificationList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState("all"); // 'all' | 'unread'
    const [categoryFilter, setCategoryFilter] = useState("all"); // 'all' | 'PROJECT' | 'NOTE' | 'TASK' | 'SCHEDULE'
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [selectedInviteNotification, setSelectedInviteNotification] = useState(null);

    // 페이징 관련 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10; // 한 페이지당 10개씩 노출

    // 알림 목록 조회 (백엔드 페이징/읽음여부 필터 API 연동)
    // 분류(category) 필터는 백엔드가 아직 파라미터를 지원하지 않는다고 가정하고
    //    우선 클라이언트 사이드로 처리합니다. 백엔드에서 category 파라미터를 받을 수 있게 되면
    //    아래 params에 { page, size, filter: filterType, category: categoryFilter } 형태로 넘기고
    //    클라이언트 필터링(filteredNotificationList)은 제거하는 것을 권장합니다.
    const loadNotifications = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const { data } = await apiClient.get("/notification/", {
                params: { page, size: pageSize, filter: filterType }
            });

            let listData = [];
            let count = 0;

            if (Array.isArray(data)) {
                listData = data;
                count = data.length;
            } else {
                listData = data.list || data.notifications || data.data || [];
                count = data.totalCount || data.count || listData.length;
            }

            setNotificationList(listData);
            setTotalCount(count);
            setCurrentPage(page);
        } catch (e) {
            console.error("❌ 알림 목록 조회 실패:", e);
            toast.error("알림 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [filterType]);

    useEffect(() => {
        loadNotifications(1); // 읽음여부 필터가 바뀌면 1페이지부터 다시 조회
    }, [loadNotifications]);

    // 분류 필터 적용 (클라이언트 사이드)
    const filteredNotificationList = useMemo(() => {
        if (categoryFilter === "all") return notificationList;
        return notificationList.filter(
            (item) => getNotificationCategory(item) === categoryFilter
        );
    }, [notificationList, categoryFilter]);

    // 개별 알림 클릭 핸들러
    const handleNotificationClick = async (item) => {
        // 프로젝트 초대 알림
        if (item.notificationType?.toLowerCase() === "project_invite") {
            setSelectedInviteNotification(item);
            setInviteModalOpen(true);
            return;
        }

        try {
            const notificationNo = item.notificationNo || item.no;
            if (isNotificationUnread(item)) {
                await apiClient.patch(`/notification/${notificationNo}/read`);
                setNotificationList((prev) =>
                    prev.map((n) =>
                        (n.notificationNo === notificationNo || n.no === notificationNo)
                            ? { ...n, notificationRead: "Y", isRead: "Y" }
                            : n
                    )
                );
            }

            const targetUrl = resolveNotificationTargetUrl(item);
            if (targetUrl) {
                navigate(targetUrl);
            } else {
                toast.info("이동할 수 없는 알림입니다.");
            }
        } catch (e) {
            console.error("❌ 알림 클릭 처리 오류:", e);
            toast.error("알림 처리 중 오류가 발생했습니다.");
        }
    };

    // 모두 읽음 처리
    const handleMarkAllAsRead = async () => {
        try {
            await apiClient.patch("/notification/read-all");
            toast.success("모든 알림이 읽음 처리되었습니다.");
            loadNotifications(currentPage);
        } catch (e) {
            console.error("❌ 전체 읽음 처리 실패:", e);
            toast.error("일괄 읽음 처리에 실패했습니다.");
        }
    };

    const formatDate = (value) => {
        if (!value) return "";
        return String(value).replace("T", " ").slice(0, 16);
    };

    // 총 페이지 수 및 페이지 번호 배열 계산
   
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="notifications-page-container">
            <div className="notifications-header">
                <h2>전체 알림 센터</h2>
                <div className="notifications-controls">
                    <Form.Select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="notifications-filter-select"
                    >
                        <option value="all">전체 보기</option>
                        <option value="unread">안 읽은 알림</option>
                    </Form.Select>
                    <Button variant="outline-primary" onClick={handleMarkAllAsRead}>
                        모두 읽음
                    </Button>
                </div>
            </div>

            {/* 분류 필터 탭 */}
            <div className="notifications-category-tabs">
                {CATEGORY_FILTERS.map((cat) => (
                    <Button
                        key={cat.value}
                        size="sm"
                        variant={categoryFilter === cat.value ? "primary" : "outline-secondary"}
                        onClick={() => setCategoryFilter(cat.value)}
                        className="notifications-category-btn"
                    >
                        {cat.label}
                    </Button>
                ))}
            </div>

            {loading ? (
                <div className="notifications-empty">알림을 불러오는 중...</div>
            ) : filteredNotificationList.length === 0 ? (
                <div className="notifications-empty">
                    확인할 알림이 없습니다.
                </div>
            ) : (
                <>
                    <div className="notifications-table-wrapper">
                        <Table hover responsive className="align-middle mb-0">
                            <thead>
                                <tr>
                                    <th style={{ width: "10%" }}>분류</th>
                                    <th style={{ width: "60%" }}>내용</th>
                                    <th style={{ width: "20%" }}>시간</th>
                                    <th style={{ width: "10%" }}>상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredNotificationList.map((item) => {
                                    const unread = isNotificationUnread(item);
                                    const category = getNotificationCategory(item);
                                    const typeLabel = getNotificationTypeLabel(category);
                                    const badgeClass = getNotificationBadgeClass(category);
                                    const content = item.notificationContent || item.content || "알림 내용이 없습니다.";
                                    const time = item.notificationCtime || item.ctime || item.regDate;

                                    return (
                                        <tr
                                            key={item.notificationNo || item.no}
                                            onClick={() => handleNotificationClick(item)}
                                            className={`notification-row ${unread ? "unread" : ""}`}
                                        >
                                            <td>
                                                <span className={`badge ${badgeClass}`}>
                                                    {typeLabel}
                                                </span>
                                            </td>
                                            <td>{content}</td>
                                            <td className="text-muted small">{formatDate(time)}</td>
                                            <td>
                                                {unread ? (
                                                    <span className="text-danger small font-weight-bold">안 읽음</span>
                                                ) : (
                                                    <span className="text-muted small">읽음</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>

                    {/* 전통적인 페이지 번호 UI (Pagination Bar) */}
                    <div className="notifications-pagination-bar">
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => loadNotifications(currentPage - 1)}
                        >
                            이전
                        </Button>

                        {pageNumbers.map((num) => (
                            <Button
                                key={num}
                                size="sm"
                                variant={currentPage === num ? "primary" : "outline-secondary"}
                                onClick={() => loadNotifications(num)}
                                className={currentPage === num ? "fw-bold" : ""}
                            >
                                {num}
                            </Button>
                        ))}

                        <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => loadNotifications(currentPage + 1)}
                        >
                            다음
                        </Button>
                    </div>
                </>
            )}
            <ProjectInviteModal
                show={inviteModalOpen}
                notification={selectedInviteNotification}
                onHide={() => {
                    setInviteModalOpen(false);
                    setSelectedInviteNotification(null);
                }}
                onSuccess={() =>
                    loadNotifications(currentPage)
                }
            />
        </div>
    );
}