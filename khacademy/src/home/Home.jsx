import { useAtomValue, useSetAtom } from "jotai";
import { loginActionState, loginUserState, notificationRefreshState } from "../utils/storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../utils/reaxios";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";

export default function Home() {

    //카카오 로그인용
    const loginAction = useSetAtom(loginActionState);

    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/member/me");
        loginAction(data);

    }, []);

    useEffect(() => {
        loadData();
    }, []);

    //----------------------------------------------
    //------------ 홈 화면용-------------------------
    //----------------------------------------------

    //로그인 사용자
    const loginUser = useAtomValue(loginUserState);

    //프로젝트 목록
    const [projectList, setProjectList] = useState([]);

    //최근 알림
    const [notificationList, setNotificationList] =
        useState([]);

    //읽지 않은 알림 수
    const [
        notificationUnreadCount,
        setNotificationUnreadCount
    ] = useState(0);

    const notificationRefresh =
        useAtomValue(notificationRefreshState);

    const requestNotificationRefresh =
        useSetAtom(notificationRefreshState);

    //로딩
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    //내 프로젝트 조회
    const loadProjectList = useCallback(async () => {
        try {
            setLoading(true);

            const { data } = await apiClient.get("/project/my");

            setProjectList(data || []);
        }
        catch (e) {
            console.error("홈 프로젝트 목록 조회 실패 : ", e);
        }
        finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProjectList();
    }, []);

    //홈에서 보여줄 프로젝트. 최근 방문 프로젝트 순
    const homeProjectList = useMemo(() => {

        //로그인 사용자 정보가 아직 없으면
        //기존 순서대로 최대 4개 표시
        if (!loginUser?.empNo) {
            return projectList.slice(0, 4);
        }//안해주면 에러남. 어차피 비로그인 유저면 projectList도 비어있어서 0개뜸

        const storageKey = `recentProjects_${loginUser.empNo}`;

        //최근 방문 프로젝트 정보
        const recentProjects = JSON.parse(localStorage.getItem(storageKey) || "[]");

        //최근 방문 순서에 맞춰 실제 서버 프로젝트 데이터 찾기
        const recentProjectList = recentProjects.map(recent =>
            projectList.find(project => project.projectNo === recent.projectNo)
        ).filter(project => project)//삭제/종료 등으로 현재 목록에 없는 프로젝트 제거

        //아직 방문 기록이 없는 프로젝트
        const otherProjectList = projectList.filter(project =>
            !recentProjects.some(recent => recent.projectNo === project.projectNo)
        );

        //최근 방문 프로젝트 먼저, 나머지는 기존 서버 조회 순서 유지
        return [
            ...recentProjectList,
            ...otherProjectList
        ].slice(0, 4);

    }, [projectList, loginUser?.empNo]);

    //프로젝트 이동
    const moveToProject = useCallback((projectNo) => {
        navigate(`/projects/${projectNo}/task`);
    }, []);

    //공개 여부 표시
    const getVisibilityName = (visibility) => {
        return visibility === "public"
            ? "공개"
            : "비공개"
    };

    //최근 알림 조회
    const loadNotifications = useCallback(async () => {
        try {
            const { data } = await apiClient.get("/notification/");

            const list = Array.isArray(data?.list)
                ? data.list
                : [];

            //홈에서는 최근 3개만
            setNotificationList(list.slice(0, 3));

            setNotificationUnreadCount(Number(data?.unReadCount) || 0);
        }
        catch (e) {
            console.error("홈 알림 조회 실패 : ", e);
        }

    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications, notificationRefresh]);

    const formatNotificationTime = useCallback((value) => {

        if (!value) return "";

        //2026-09-17 10:30:12
        const [date, time] = value.split(" ");

        if (!date || !time) return value;

        return `${date.substring(5)} ${time.substring(0, 5)}`;

    }, []);

    const moveNotification = useCallback(async (notification) => {

        if (!notification) return;

        const isUnread = notification.notificationRead === "N";

        //읽음 처리
        if (isUnread) {
            try {
                await apiClient.patch(
                    `/notification/${notification.notificationNo}/read`
                );

                //공용 알림 갱신 요청
                requestNotificationRefresh(
                    prev => prev + 1
                );
            }
            catch (e) {
                console.error("홈 알림 읽음 처리 실패 : ", e);
            }
        }

        if (!notification.notificationUrl) return;

        let targetUrl = notification.notificationUrl;

        //Task 알림
        const isTask = notification.notificationType?.includes("TASK");

        if (
            isTask
            && notification.projectNo
            && notification.notificationTarget
        ) {
            targetUrl =
                `/projects/${notification.projectNo}`
                + `/task?taskNo=${notification.notificationTarget}`;
        }

        //Schedule 알림
        const isSchedule =
            notification.notificationType
                ?.includes("SCHEDULE");


        if (
            isSchedule
            && notification.projectNo
        ) {

            targetUrl = `/projects/${notification.projectNo}/calendar`;

            if (notification.notificationTarget) {
                targetUrl +=
                    `?scheduleNo=${notification.notificationTarget}`;

            }
        }

        navigate(targetUrl);

    }, [navigate, requestNotificationRefresh]);

    return (<>
        <div className="home-page">
            {/* 상단 */}
            <div className="home-welcome">
                <div>
                    <h2 className="home-title">
                        안녕하세요, {loginUser?.empName || "사용자"}님
                    </h2>

                    <div className="home-description">
                        참여 중인 프로젝트를 확인하고
                        바로 이어서 작업해보세요
                    </div>
                </div>

                <button
                    type="button"
                    className="home-create-button"
                    onClick={() => navigate("/projects/add")}
                >
                    + 새 프로젝트
                </button>
            </div>

            <div className="home-layout">
                {/* 왼쪽 */}
                <div className="home-main">
                    <div className="home-section-header">
                        <div>
                            <div className="home-section-title">
                                진행 중 프로젝트
                            </div>

                            <div className="home-section-subtitle">
                                현재 참여하고 있는 프로젝트입니다
                            </div>
                        </div>

                        <button
                            type="button"
                            className="home-text-button"
                            onClick={() => navigate("/projects/my")}
                        >
                            전체보기 →
                        </button>
                    </div>

                    {loading === true ? (
                        <div className="home-project-empty">
                            프로젝트를 불러오는 중입니다
                        </div>
                    ) : homeProjectList.length === 0 ? (
                        <div className="home-project-empty">
                            <strong>
                                참여 중인 프로젝트가 없습니다
                            </strong>

                            <span>
                                새 프로젝트를 만들거나
                                공개 프로젝트에 참여해보세요
                            </span>
                        </div>

                    ) : (
                        <div className="home-project-list">
                            {homeProjectList.map(project => (
                                <button
                                    type="button"
                                    key={project.projectNo}
                                    className="home-project-item"
                                    onClick={() => moveToProject(project.projectNo)}
                                >
                                    <div className="home-project-info">
                                        <div className="home-project-title-row">
                                            <span className="home-project-name">
                                                {project.projectName}
                                            </span>

                                            <span
                                                className={
                                                    `home-project-role ${project.projectMemberRole
                                                    }`
                                                }
                                            >
                                                {project.projectMemberRole?.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="home-project-purpose">
                                            {project.projectPurpose || "등록된 프로젝트 설명이 없습니다"}
                                        </div>

                                        <div className="home-project-meta">
                                            <span>
                                                {getVisibilityName(project.projectVisibility)}
                                            </span>
                                        </div>
                                    </div>

                                    <span className="home-project-open">
                                        열기 →
                                    </span>
                                </button>
                            ))}
                        </div>



                    )}
                </div>

                {/* 오른쪽 */}
                <div className="home-side">
                    <div className="home-side-card">
                        <div className="home-side-title">
                            프로젝트 현황
                        </div>

                        <div className="home-project-count">
                            <strong>
                                {projectList.length}
                            </strong>

                            <span>
                                참여 프로젝트
                            </span>
                        </div>
                    </div>

                    <div className="home-side-card">
                        <div className="home-side-title">
                            빠른 이동
                        </div>

                        <div className="home-quick-list">
                            <button
                                type="button"
                                onClick={() => navigate("/projects/my")}
                            >
                                <span>내 프로젝트</span>
                                <span>→</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/projects/public")}
                            >
                                <span>
                                    공개 프로젝트
                                </span>
                                <span>
                                    →
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/projects/archive")}
                            >
                                <span>아카이브</span>
                                <span>→</span>
                            </button>
                        </div>
                    </div>

                    <div className="home-side-card home-notification-card">

                        <div className="home-notification-header">

                            <div className="home-side-title">
                                최근 알림
                            </div>


                            {notificationUnreadCount > 0 && (
                                <span className="home-notification-count">

                                    {notificationUnreadCount > 99
                                        ? "99+"
                                        : notificationUnreadCount
                                    }

                                </span>
                            )}

                        </div>


                        {notificationList.length === 0 ? (
                            <div className="home-notification-empty">
                                <Bell size={17} />

                                <span>
                                    새로운 알림이 없습니다.
                                </span>
                            </div>
                        ) : (

                            <div className="home-notification-list">
                                {notificationList.map(notification => {
                                    const isUnread = notification.notificationRead === "N";

                                    return (
                                        <button
                                            type="button"
                                            key={notification.notificationNo}
                                            className={
                                                `home-notification-item ${isUnread
                                                    ? "unread"
                                                    : ""
                                                }`
                                            }
                                            onClick={() =>
                                                moveNotification(notification)
                                            }
                                        >

                                            <span
                                                className={
                                                    `home-notification-dot ${isUnread
                                                        ? "unread"
                                                        : ""
                                                    }`
                                                }
                                            />

                                            <div className="home-notification-content">
                                                <div className="home-notification-text">
                                                    {notification.notificationContent}
                                                </div>

                                                <div className="home-notification-time">
                                                    {formatNotificationTime(
                                                        notification.notificationCtime
                                                    )}

                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                            </div>

                        )}

                    </div>
                </div>
            </div>
        </div>

    </>);
}