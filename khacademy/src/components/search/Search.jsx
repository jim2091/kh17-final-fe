import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import "./Search.css";

const FILTER_OPTIONS = [
    { key: "user", label: "사용자" },
    { key: "project", label: "프로젝트" },
    { key: "task", label: "업무" },
    { key: "record", label: "기록" },
    { key: "note", label: "노트" },
    { key: "file", label: "파일" },
];

const FILTER_KEYS = FILTER_OPTIONS.map(option => option.key);

const EMPTY_RESULT = {
    keyword: "",
    filter: "all",
    users: [],
    projects: [],
    tasks: [],
    records: [],
    notes: [],
    files: [],
};

export default function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const keyword = searchParams.get("keyword") || "";

    const getFiltersFromUrl = () => {
        const filterParam = searchParams.get("filter");

        if (!filterParam || filterParam === "all") {
            return ["all"];
        }

        const parsedFilters = filterParam
            .split(",")
            .map(filter => filter.trim())
            .filter(filter => FILTER_KEYS.includes(filter));

        return parsedFilters.length ? parsedFilters : ["all"];
    };

    const [filters, setFilters] = useState(() => getFiltersFromUrl());
    const [result, setResult] = useState(EMPTY_RESULT);
    const [loading, setLoading] = useState(false);
    const [joiningProjectNo, setJoiningProjectNo] = useState(null);
    const [error, setError] = useState("");

    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserInfo, setSelectedUserInfo] = useState(null);
    const [projectHistory, setProjectHistory] = useState([]);
    const [projectHistoryLoading, setProjectHistoryLoading] = useState(false);
    const [projectHistoryError, setProjectHistoryError] = useState("");

    /*
     * ==================================================
     * 사용자 프로필 이미지 URL
     * ==================================================
     */
    const getProfileImageUrl = attachNo => {
        if (!attachNo) {
            return "";
        }

        return `${
            import.meta.env.VITE_SERVER_URL
        }/api/attach/${attachNo}`;
    };

    /*
     * ==================================================
     * URL 필터 변경 감지
     * ==================================================
     */
    useEffect(() => {
        setFilters(getFiltersFromUrl());
    }, [searchParams]);

    /*
     * ==================================================
     * 사용자 클릭
     * ==================================================
     */
    const handleUserClick = async user => {
        setSelectedUser(user);
        setSelectedUserInfo(null);
        setProjectHistory([]);
        setProjectHistoryError("");
        setProjectHistoryLoading(true);

        try {
            const response = await apiClient.get(
                `/search/user/${user.empNo}/projects`
            );

            const data = response.data || {};

            setSelectedUserInfo({
                empNo: data.empNo ?? user.empNo,
                empName: data.empName ?? user.empName ?? "",
                empEmail: data.empEmail ?? user.empEmail ?? "",
                deptName: data.deptName ?? "",
                positionName: data.positionName ?? "",
                empContact: data.empContact ?? "",
                attachNo: data.attachNo ?? user.attachNo ?? null,
            });

            setProjectHistory(
                Array.isArray(data.projects) ? data.projects : []
            );
        } catch (error) {
            console.error("프로젝트 참여 이력 조회 실패:", error);

            /*
             * 프로젝트 이력 API에서 프로필 정보가
             * 없더라도 검색 결과의 사용자 정보를 사용
             */
            setSelectedUserInfo({
                empNo: user.empNo,
                empName: user.empName ?? "",
                empEmail: user.empEmail ?? "",
                deptName: "",
                positionName: "",
                empContact: "",
                attachNo: user.attachNo ?? null,
            });

            setProjectHistoryError(
                "프로젝트 참여 이력을 불러오지 못했습니다."
            );
        } finally {
            setProjectHistoryLoading(false);
        }
    };

    /*
     * ==================================================
     * 사용자 모달 닫기
     * ==================================================
     */
    const handleCloseUserModal = () => {
        setSelectedUser(null);
        setSelectedUserInfo(null);
        setProjectHistory([]);
        setProjectHistoryError("");
        setProjectHistoryLoading(false);
    };

    /*
     * ==================================================
     * ESC로 사용자 모달 닫기
     * ==================================================
     */
    useEffect(() => {
        if (!selectedUser) return;

        const handleKeyDown = e => {
            if (e.key === "Escape") {
                handleCloseUserModal();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedUser]);

    /*
     * ==================================================
     * 사용자 모달 열렸을 때 배경 스크롤 방지
     * ==================================================
     */
    useEffect(() => {
        if (!selectedUser) return;

        const originalOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [selectedUser]);

    /*
     * ==================================================
     * 날짜 포맷
     * ==================================================
     */
    const formatDate = dateValue => {
        if (!dateValue) return "-";

        const normalizedDate =
            typeof dateValue === "string" && dateValue.includes(" ")
                ? dateValue.replace(" ", "T")
                : dateValue;

        const date = new Date(normalizedDate);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    };

    /*
     * ==================================================
     * 프로젝트 상태
     * ==================================================
     */
    const isProjectActive = status =>
        String(status ?? "")
            .trim()
            .toLowerCase() === "active";

    const getProjectStatusLabel = status =>
        isProjectActive(status) ? "진행 중" : "종료";

    const getProjectStatusClass = status =>
        isProjectActive(status) ? "active" : "ended";

    /*
     * ==================================================
     * 프로젝트 역할
     * ==================================================
     */
    const getProjectRoleLabel = role => {
        if (!role) return "역할 없음";

        const normalizedRole = String(role).toLowerCase();

        if (normalizedRole === "owner") return "owner";
        if (normalizedRole === "manager") return "관리자";
        if (normalizedRole === "member") return "멤버";

        return role;
    };

    /*
     * ==================================================
     * 필터 상태
     * ==================================================
     */
    const isAllSelected = filters.includes("all");

    const isSelected = filterKey => filters.includes(filterKey);

    /*
     * ==================================================
     * 필터 변경
     * ==================================================
     */
    const handleFilterChange = filterKey => {
        let nextFilters = [];

        if (filterKey === "all") {
            nextFilters = isAllSelected ? [] : ["all"];
        } else if (isAllSelected) {
            nextFilters = [filterKey];
        } else if (filters.includes(filterKey)) {
            nextFilters = filters.filter(filter => filter !== filterKey);
        } else {
            nextFilters = [...filters, filterKey];
        }

        setFilters(nextFilters);

        const params = new URLSearchParams();

        if (keyword) {
            params.set("keyword", keyword);
        }

        if (nextFilters.length === 1 && nextFilters[0] === "all") {
            params.set("filter", "all");
        } else if (nextFilters.length > 0) {
            params.set("filter", nextFilters.join(","));
        }

        setSearchParams(params);
    };

    /*
     * ==================================================
     * 검색 API 호출
     * ==================================================
     */
    useEffect(() => {
        const fetchSearch = async () => {
            if (!keyword.trim()) {
                setResult({ ...EMPTY_RESULT });
                setLoading(false);
                setError("");
                return;
            }

            if (!filters.length) {
                setResult({
                    ...EMPTY_RESULT,
                    keyword,
                    filter: "",
                });

                setLoading(false);
                setError("");
                return;
            }

            try {
                setLoading(true);
                setError("");

                const filterParam = filters.includes("all")
                    ? "all"
                    : filters.join(",");

                const response = await apiClient.get("/search", {
                    params: {
                        keyword,
                        filter: filterParam,
                    },
                });

                setResult({
                    ...EMPTY_RESULT,
                    ...(response.data || {}),
                    users: response.data?.users || [],
                    projects: response.data?.projects || [],
                    tasks: response.data?.tasks || [],
                    records: response.data?.records || [],
                    notes: response.data?.notes || [],
                    files: response.data?.files || [],
                });
            } catch (e) {
                console.error("검색 실패:", e);
                setError("검색 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchSearch();
    }, [keyword, filters]);

    /*
     * ==================================================
     * 전체 검색 결과 개수
     * ==================================================
     */
    const totalCount =
        (result.users?.length || 0) +
        (result.projects?.length || 0) +
        (result.tasks?.length || 0) +
        (result.records?.length || 0) +
        (result.notes?.length || 0) +
        (result.files?.length || 0);

    /*
     * ==================================================
     * 프로젝트 클릭
     * ==================================================
     */
    const handleProjectClick = (projectNo, projectRole) => {
        if (!projectNo) {
            console.warn("프로젝트 번호가 없습니다.");
            return;
        }

        if (!["owner", "member"].includes(projectRole)) {
            return;
        }

        navigate(`/projects/${projectNo}`);
    };

    /*
     * ==================================================
     * 프로젝트 참여
     * ==================================================
     */
    const handleProjectJoin = async projectNo => {
        if (!projectNo) {
            console.warn("프로젝트 번호가 없습니다.");
            return;
        }

        if (joiningProjectNo === projectNo) {
            return;
        }

        const confirmed = window.confirm(
            "정말 이 프로젝트에 참여하시겠습니까?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setJoiningProjectNo(projectNo);

            await apiClient.post(`/project/${projectNo}/join`);

            setResult(prev => ({
                ...prev,
                projects:
                    prev.projects?.map(project =>
                        project.projectNo === projectNo
                            ? {
                                  ...project,
                                  projectRole: "member",
                                  memberCount:
                                      (project.memberCount || 0) + 1,
                              }
                            : project
                    ) || [],
            }));
        } catch (e) {
            console.error("프로젝트 참여 실패:", e);

            alert(
                e?.response?.data?.message ||
                    "프로젝트 참여에 실패했습니다."
            );
        } finally {
            setJoiningProjectNo(null);
        }
    };

    /*
     * ==================================================
     * 업무 클릭
     * ==================================================
     */
    const handleTaskClick = projectNo => {
        if (!projectNo) {
            console.warn("업무의 projectNo가 없습니다.");
            return;
        }

        navigate(`/projects/${projectNo}/task`);
    };

    /*
     * ==================================================
     * 기록 클릭
     * ==================================================
     */
    const handleRecordClick = projectNo => {
        if (!projectNo) {
            console.warn("기록의 projectNo가 없습니다.");
            return;
        }

        navigate(`/projects/${projectNo}/records`);
    };

    /*
     * ==================================================
     * 노트 클릭
     * ==================================================
     */
    const handleNoteClick = (projectNo, noteNo) => {
        if (!projectNo) {
            console.warn("노트의 projectNo가 없습니다.");
            return;
        }

        if (!noteNo) {
            console.warn("노트의 noteNo가 없습니다.");
            return;
        }

        navigate(`/projects/${projectNo}/note/${noteNo}`);
    };

    /*
     * ==================================================
     * 파일 클릭
     * ==================================================
     */
    const handleFileClick = projectNo => {
        if (!projectNo) {
            console.warn("파일의 projectNo가 없습니다.");
            return;
        }

        navigate(`/projects/${projectNo}/files`);
    };

    /*
     * ==================================================
     * 파일 확장자
     * ==================================================
     */
    const getExtension = (fileName = "") => {
        const index = fileName.lastIndexOf(".");

        return index === -1
            ? ""
            : fileName.substring(index + 1).toLowerCase();
    };

    /*
     * ==================================================
     * 파일 타입
     * ==================================================
     */
    const getFileType = (fileName = "") => {
        const extension = getExtension(fileName);

        if (
            [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "webp",
                "svg",
                "bmp",
            ].includes(extension)
        ) {
            return "image";
        }

        if (extension === "pdf") return "pdf";

        if (["doc", "docx"].includes(extension)) {
            return "word";
        }

        if (["xls", "xlsx"].includes(extension)) {
            return "excel";
        }

        if (["ppt", "pptx"].includes(extension)) {
            return "powerpoint";
        }

        if (["zip", "rar", "7z"].includes(extension)) {
            return "zip";
        }

        return "file";
    };

    /*
     * ==================================================
     * 파일 URL
     * ==================================================
     */
    const getFileUrl = attachNo =>
        attachNo
            ? `${
                  import.meta.env.VITE_SERVER_URL
              }/api/attach/${attachNo}`
            : "";

    /*
     * ==================================================
     * 파일 아이콘
     * ==================================================
     */
    const SearchFileIcon = ({ file }) => {
        const type = getFileType(file.attachName);

        if (type === "image") {
            return (
                <div className="search-file-thumbnail">
                    <img
                        src={getFileUrl(file.attachNo)}
                        alt={file.attachName || "이미지"}
                        onError={e => {
                            e.currentTarget.style.display = "none";

                            if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display =
                                    "flex";
                            }
                        }}
                    />

                    <div
                        className="search-file-thumbnail-fallback"
                        style={{ display: "none" }}
                    >
                        <span>이미지 없음</span>
                    </div>
                </div>
            );
        }

        const iconMap = {
            pdf: ["search-file-icon-pdf", "PDF"],
            word: ["search-file-icon-word", "W"],
            excel: ["search-file-icon-excel", "X"],
            powerpoint: ["search-file-icon-powerpoint", "P"],
            zip: ["search-file-icon-zip", "ZIP"],
        };

        if (iconMap[type]) {
            const [className, label] = iconMap[type];

            return (
                <div className={`search-file-icon ${className}`}>
                    <span>{label}</span>
                </div>
            );
        }

        return (
            <div className="search-file-icon search-file-icon-default">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                </svg>
            </div>
        );
    };

    /*
     * ==================================================
     * 프로젝트 이력 분리
     * ==================================================
     */
    const activeProjectHistory = projectHistory.filter(history =>
        isProjectActive(history.projectStatus)
    );

    const endedProjectHistory = projectHistory.filter(
        history => !isProjectActive(history.projectStatus)
    );

    return (
        <div className="search-page">
            <div className="search-page-header">
                <h1 className="search-page-title">검색</h1>
            </div>

            <div className="search-content">
                {/* ==================================================
                    검색 필터
                ================================================== */}
                <aside className="search-filter">
                    <div className="search-filter-title">검색대상</div>

                    <div className="search-filter-list">
                        <label className="search-filter-item">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={() =>
                                    handleFilterChange("all")
                                }
                            />
                            <span>전체</span>
                        </label>

                        {FILTER_OPTIONS.map(option => (
                            <label
                                key={option.key}
                                className="search-filter-item"
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected(option.key)}
                                    onChange={() =>
                                        handleFilterChange(option.key)
                                    }
                                />

                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                </aside>

                {/* ==================================================
                    검색 결과
                ================================================== */}
                <main className="search-result">
                    {keyword && (
                        <div className="search-page-keyword">
                            <span>검색어</span>
                            <strong>"{keyword}"</strong>
                        </div>
                    )}

                    {keyword &&
                        filters.length > 0 &&
                        !loading &&
                        !error && (
                            <div className="search-result-summary">
                                검색 결과 <strong>{totalCount}</strong>개
                            </div>
                        )}

                    {!keyword && (
                        <div className="search-empty-page">
                            <div className="search-empty-icon">🔍</div>

                            <h2>검색어를 입력해주세요.</h2>

                            <p>
                                상단 검색창에서 원하는 검색어를 입력해주세요.
                            </p>
                        </div>
                    )}

                    {keyword && !filters.length && (
                        <div className="search-filter-empty">
                            <div className="search-filter-empty-icon">
                                ☑
                            </div>

                            <h2>검색 대상을 선택해주세요.</h2>

                            <p>
                                왼쪽에서 검색할 대상을 하나 이상 선택해주세요.
                            </p>
                        </div>
                    )}

                    {keyword &&
                        filters.length > 0 &&
                        loading && (
                            <div className="search-status">
                                검색 중입니다...
                            </div>
                        )}

                    {keyword &&
                        filters.length > 0 &&
                        !loading &&
                        error && (
                            <div className="search-error">
                                {error}
                            </div>
                        )}

                    {keyword &&
                        filters.length > 0 &&
                        !loading &&
                        !error && (
                            <div className="search-result-list-container">
                                {/* ==================================================
                                    사용자
                                ================================================== */}
                                {(isAllSelected ||
                                    isSelected("user")) && (
                                    <SearchSection
                                        title="사용자"
                                        count={result.users?.length || 0}
                                    >
                                        {result.users?.map(user => (
                                            <div
                                                className="search-result-item search-user-result-item"
                                                key={user.empNo}
                                                onClick={() =>
                                                    handleUserClick(user)
                                                }
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                    ) {
                                                        e.preventDefault();

                                                        handleUserClick(
                                                            user
                                                        );
                                                    }
                                                }}
                                            >
                                                {/* ==================================================
                                                    사용자 프로필 이미지
                                                ================================================== */}
                                                <div className="search-user-avatar">
                                                    {user.attachNo ? (
                                                        <img
                                                            src={getProfileImageUrl(
                                                                user.attachNo
                                                            )}
                                                            alt={
                                                                user.empName ||
                                                                "프로필"
                                                            }
                                                            className="search-user-profile-image"
                                                            onError={e => {
                                                                e.currentTarget.style.display =
                                                                    "none";

                                                                if (
                                                                    e.currentTarget
                                                                        .nextElementSibling
                                                                ) {
                                                                    e.currentTarget.nextElementSibling.style.display =
                                                                        "flex";
                                                                }
                                                            }}
                                                        />
                                                    ) : null}

                                                    <div
                                                        className="search-user-avatar-fallback"
                                                        style={{
                                                            display: user.attachNo
                                                                ? "none"
                                                                : "flex",
                                                        }}
                                                    >
                                                        {user.empName?.charAt(
                                                            0
                                                        ) || "?"}
                                                    </div>
                                                </div>

                                                <div className="search-item-main">
                                                    <div className="search-item-title">
                                                        {user.empName ||
                                                            "이름 없음"}
                                                    </div>

                                                    <div className="search-item-sub">
                                                        {user.empEmail || ""}
                                                    </div>
                                                </div>

                                                <div className="search-user-arrow">
                                                    <span>
                                                        프로젝트 이력
                                                    </span>

                                                    <span className="search-user-arrow-icon">
                                                        →
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </SearchSection>
                                )}

                                {/* ==================================================
                                    프로젝트
                                ================================================== */}
                                {(isAllSelected ||
                                    isSelected("project")) && (
                                    <SearchSection
                                        title="프로젝트"
                                        count={
                                            result.projects?.length || 0
                                        }
                                    >
                                        {result.projects?.map(project => {
                                            const clickable = [
                                                "owner",
                                                "member",
                                            ].includes(
                                                project.projectRole
                                            );

                                            return (
                                                <div
                                                    className={`search-result-item search-project-result-item ${
                                                        clickable
                                                            ? "project-clickable"
                                                            : "project-not-member"
                                                    }`}
                                                    key={project.projectNo}
                                                    onClick={() =>
                                                        handleProjectClick(
                                                            project.projectNo,
                                                            project.projectRole
                                                        )
                                                    }
                                                    role="button"
                                                    tabIndex={
                                                        clickable ? 0 : -1
                                                    }
                                                    onKeyDown={e => {
                                                        if (
                                                            e.key ===
                                                                "Enter" &&
                                                            clickable
                                                        ) {
                                                            handleProjectClick(
                                                                project.projectNo,
                                                                project.projectRole
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <div className="search-project-icon">
                                                        P
                                                    </div>

                                                    <div className="search-item-main">
                                                        <div className="search-project-title-row">
                                                            <div className="search-item-title">
                                                                {project.projectName ||
                                                                    "프로젝트 이름 없음"}
                                                            </div>

                                                            <span className="project-member-count">
                                                                참여 :{" "}
                                                                {project.memberCount ??
                                                                    0}
                                                                명
                                                            </span>
                                                        </div>

                                                        <div className="search-item-sub">
                                                            {project.projectPurpose ||
                                                                ""}
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="search-project-action"
                                                        onClick={e =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        {project.projectRole ===
                                                            "owner" && (
                                                            <span className="project-role owner">
                                                                owner
                                                            </span>
                                                        )}

                                                        {project.projectRole ===
                                                            "member" && (
                                                            <span className="project-role member">
                                                                참여 중
                                                            </span>
                                                        )}

                                                        {!project.projectRole && (
                                                            <button
                                                                type="button"
                                                                className="project-join-button"
                                                                disabled={
                                                                    joiningProjectNo ===
                                                                    project.projectNo
                                                                }
                                                                onClick={() =>
                                                                    handleProjectJoin(
                                                                        project.projectNo
                                                                    )
                                                                }
                                                            >
                                                                {joiningProjectNo ===
                                                                project.projectNo
                                                                    ? "참여 중..."
                                                                    : "참여"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </SearchSection>
                                )}

                                {/* ==================================================
                                    업무
                                ================================================== */}
                                {(isAllSelected ||
                                    isSelected("task")) && (
                                    <SearchSection
                                        title="업무"
                                        count={result.tasks?.length || 0}
                                    >
                                        {result.tasks?.map(task => (
                                            <div
                                                className="search-result-item search-task-result-item"
                                                key={task.taskNo}
                                                onClick={() =>
                                                    handleTaskClick(
                                                        task.projectNo
                                                    )
                                                }
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") {
                                                        handleTaskClick(
                                                            task.projectNo
                                                        );
                                                    }
                                                }}
                                            >
                                                <div className="search-task-icon">
                                                    T
                                                </div>

                                                <div className="search-item-main">
                                                    <div className="search-item-project">
                                                        {task.projectName ||
                                                            "프로젝트 없음"}
                                                    </div>

                                                    <div className="search-item-title">
                                                        {task.taskTitle ||
                                                            "업무 이름 없음"}
                                                    </div>

                                                    <div className="search-item-sub">
                                                        {task.taskContent ||
                                                            ""}
                                                    </div>
                                                </div>

                                                <div className="search-result-arrow">
                                                    →
                                                </div>
                                            </div>
                                        ))}
                                    </SearchSection>
                                )}

                                {/* ==================================================
                                    기록
                                ================================================== */}
                                {(isAllSelected ||
                                    isSelected("record")) && (
                                    <SearchSection
                                        title="기록"
                                        count={
                                            result.records?.length || 0
                                        }
                                    >
                                        {result.records?.map(
                                            (record, index) => (
                                                <div
                                                    className="search-result-item search-record-result-item"
                                                    key={
                                                        record.projectRecordNo ||
                                                        index
                                                    }
                                                    onClick={() =>
                                                        handleRecordClick(
                                                            record.projectNo
                                                        )
                                                    }
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={e => {
                                                        if (
                                                            e.key === "Enter"
                                                        ) {
                                                            handleRecordClick(
                                                                record.projectNo
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <div className="search-record-icon">
                                                        R
                                                    </div>

                                                    <div className="search-item-main">
                                                        <div className="search-item-project">
                                                            {record.projectName ||
                                                                "프로젝트 없음"}
                                                        </div>

                                                        <div className="search-item-title">
                                                            {record.projectRecordTitle ||
                                                                "기록 제목 없음"}
                                                        </div>

                                                        <div className="search-item-sub">
                                                            {record.writerName && (
                                                                <>
                                                                    {
                                                                        record.writerName
                                                                    }
                                                                    {" · "}
                                                                </>
                                                            )}

                                                            {record.projectRecordType ||
                                                                ""}
                                                        </div>

                                                        {record.projectRecordContent && (
                                                            <div className="search-item-content">
                                                                {
                                                                    record.projectRecordContent
                                                                }
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="search-result-arrow">
                                                        →
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </SearchSection>
                                )}

                                {/* ==================================================
                                    노트
                                ================================================== */}
                                {(isAllSelected ||
                                    isSelected("note")) && (
                                    <SearchSection
                                        title="노트"
                                        count={
                                            result.notes?.length || 0
                                        }
                                    >
                                        {result.notes?.map(
                                            (note, index) => (
                                                <div
                                                    className="search-result-item search-note-result-item"
                                                    key={
                                                        note.noteNo || index
                                                    }
                                                    onClick={() =>
                                                        handleNoteClick(
                                                            note.projectNo,
                                                            note.noteNo
                                                        )
                                                    }
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={e => {
                                                        if (
                                                            e.key === "Enter"
                                                        ) {
                                                            handleNoteClick(
                                                                note.projectNo,
                                                                note.noteNo
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <div className="search-note-icon">
                                                        N
                                                    </div>

                                                    <div className="search-item-main">
                                                        <div className="search-item-project">
                                                            {note.projectName ||
                                                                "프로젝트 없음"}
                                                        </div>

                                                        <div className="search-item-title">
                                                            {note.noteTitle ||
                                                                "노트 제목 없음"}
                                                        </div>

                                                        <div className="search-item-sub">
                                                            {note.writerName ||
                                                                ""}
                                                        </div>

                                                        {note.noteContent && (
                                                            <div className="search-item-content">
                                                                {
                                                                    note.noteContent
                                                                }
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="search-result-arrow">
                                                        →
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </SearchSection>
                                )}

                                {/* ==================================================
                                    파일
                                ================================================== */}
                                {(isAllSelected ||
                                    isSelected("file")) && (
                                    <SearchSection
                                        title="파일"
                                        count={result.files?.length || 0}
                                    >
                                        {result.files?.map(file => (
                                            <div
                                                className="search-result-item search-file-result-item search-file-clickable"
                                                key={file.attachNo}
                                                onClick={() =>
                                                    handleFileClick(
                                                        file.projectNo
                                                    )
                                                }
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (
                                                        e.key === "Enter"
                                                    ) {
                                                        handleFileClick(
                                                            file.projectNo
                                                        );
                                                    }
                                                }}
                                            >
                                                <SearchFileIcon
                                                    file={file}
                                                />

                                                <div className="search-item-main">
                                                    <div className="search-item-project">
                                                        {file.projectName ||
                                                            "프로젝트 없음"}
                                                    </div>

                                                    <div className="search-item-title">
                                                        {file.attachName ||
                                                            "파일 이름 없음"}
                                                    </div>

                                                    <div className="search-item-sub">
                                                        {file.empName && (
                                                            <>
                                                                {file.empName}
                                                                {" · "}
                                                            </>
                                                        )}

                                                        {file.attachType ||
                                                            ""}
                                                    </div>

                                                    {file.attachSource && (
                                                        <div className="search-item-content">
                                                            출처 :{" "}
                                                            {
                                                                file.attachSource
                                                            }
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="search-result-arrow">
                                                    →
                                                </div>
                                            </div>
                                        ))}
                                    </SearchSection>
                                )}
                            </div>
                        )}
                </main>
            </div>

            {/* ==================================================
                사용자 프로젝트 이력 모달
            ================================================== */}
            {selectedUser && (
                <div
                    className="user-project-modal-overlay"
                    onMouseDown={e => {
                        if (e.target === e.currentTarget) {
                            handleCloseUserModal();
                        }
                    }}
                >
                    <div
                        className="user-project-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="user-project-modal-title"
                    >
                        {/* ==================================================
                            모달 헤더
                        ================================================== */}
                        <div className="user-project-modal-header">
                            <div className="user-project-modal-user-area">
                                <div className="user-project-modal-user">
                                    {/* ==================================================
                                        모달 프로필 이미지
                                    ================================================== */}
                                    <div className="user-project-modal-avatar">
                                        {selectedUserInfo?.attachNo ? (
                                            <img
                                                src={getProfileImageUrl(
                                                    selectedUserInfo.attachNo
                                                )}
                                                alt={
                                                    selectedUserInfo.empName ||
                                                    "프로필"
                                                }
                                                className="user-project-modal-profile-image"
                                                onError={e => {
                                                    e.currentTarget.style.display =
                                                        "none";

                                                    if (
                                                        e.currentTarget
                                                            .nextElementSibling
                                                    ) {
                                                        e.currentTarget.nextElementSibling.style.display =
                                                            "flex";
                                                    }
                                                }}
                                            />
                                        ) : null}

                                        <div
                                            className="user-project-modal-avatar-fallback"
                                            style={{
                                                display: selectedUserInfo?.attachNo
                                                    ? "none"
                                                    : "flex",
                                            }}
                                        >
                                            {selectedUserInfo?.empName?.charAt(
                                                0
                                            ) || "?"}
                                        </div>
                                    </div>

                                    <div className="user-project-modal-user-text">
                                        <h2
                                            id="user-project-modal-title"
                                            className="user-project-modal-title"
                                        >
                                            {selectedUserInfo?.empName ||
                                                "이름 없음"}
                                        </h2>

                                        <div className="user-project-modal-email">
                                            {selectedUserInfo?.empEmail ||
                                                ""}
                                        </div>
                                    </div>
                                </div>

                                {/* 사용자 정보 */}
                                <div className="user-project-modal-user-info">
                                    <div className="user-project-modal-info-item">
                                        <span className="user-project-modal-info-label">
                                            부서
                                        </span>

                                        <strong className="user-project-modal-info-value">
                                            {selectedUserInfo?.deptName ||
                                                "-"}
                                        </strong>
                                    </div>

                                    <div className="user-project-modal-info-item">
                                        <span className="user-project-modal-info-label">
                                            직급
                                        </span>

                                        <strong className="user-project-modal-info-value">
                                            {selectedUserInfo?.positionName ||
                                                "-"}
                                        </strong>
                                    </div>

                                    <div className="user-project-modal-info-item">
                                        <span className="user-project-modal-info-label">
                                            연락처
                                        </span>

                                        <strong className="user-project-modal-info-value">
                                            {selectedUserInfo?.empContact ||
                                                "-"}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="user-project-modal-close"
                                onClick={handleCloseUserModal}
                                aria-label="닫기"
                            >
                                ×
                            </button>
                        </div>

                        {/* ==================================================
                            모달 본문
                        ================================================== */}
                        <div className="user-project-modal-body">
                            {projectHistoryLoading && (
                                <div className="user-project-modal-status">
                                    <div className="user-project-loading-spinner" />

                                    <span>
                                        프로젝트 이력을 불러오는 중입니다...
                                    </span>
                                </div>
                            )}

                            {!projectHistoryLoading &&
                                projectHistoryError && (
                                    <div className="user-project-modal-error">
                                        <div className="user-project-modal-error-icon">
                                            !
                                        </div>

                                        <p>
                                            {projectHistoryError}
                                        </p>
                                    </div>
                                )}

                            {!projectHistoryLoading &&
                                !projectHistoryError &&
                                projectHistory.length === 0 && (
                                    <div className="user-project-modal-empty">
                                        <div className="user-project-modal-empty-icon">
                                            P
                                        </div>

                                        <h3>
                                            프로젝트 참여 이력이 없습니다.
                                        </h3>

                                        <p>
                                            해당 사용자의 프로젝트 참여 기록이
                                            없습니다.
                                        </p>
                                    </div>
                                )}

                            {!projectHistoryLoading &&
                                !projectHistoryError &&
                                projectHistory.length > 0 && (
                                    <div className="user-project-history-groups">
                                        <ProjectHistoryGroup
                                            title="진행 중인 프로젝트"
                                            histories={
                                                activeProjectHistory
                                            }
                                            emptyText="현재 진행 중인 프로젝트가 없습니다."
                                            getProjectStatusClass={
                                                getProjectStatusClass
                                            }
                                            getProjectStatusLabel={
                                                getProjectStatusLabel
                                            }
                                            getProjectRoleLabel={
                                                getProjectRoleLabel
                                            }
                                            formatDate={formatDate}
                                        />

                                        <hr />

                                        <ProjectHistoryGroup
                                            title="종료된 프로젝트"
                                            histories={
                                                endedProjectHistory
                                            }
                                            ended
                                            getProjectStatusClass={
                                                getProjectStatusClass
                                            }
                                            getProjectStatusLabel={
                                                getProjectStatusLabel
                                            }
                                            getProjectRoleLabel={
                                                getProjectRoleLabel
                                            }
                                            formatDate={formatDate}
                                        />
                                    </div>
                                )}
                        </div>

                        {/* ==================================================
                            모달 푸터
                        ================================================== */}
                        <div className="user-project-modal-footer">
                            <span>
                                진행 중{" "}
                                <strong>
                                    {activeProjectHistory.length}
                                </strong>
                                {" · "}
                                종료{" "}
                                <strong>
                                    {endedProjectHistory.length}
                                </strong>
                                {" · "}
                                총{" "}
                                <strong>
                                    {projectHistory.length}
                                </strong>
                                개의 프로젝트
                            </span>

                            <button
                                type="button"
                                onClick={handleCloseUserModal}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/*
 * ==================================================
 * 프로젝트 이력 그룹
 * ==================================================
 */
function ProjectHistoryGroup({
    title,
    histories,
    emptyText,
    ended,
    getProjectStatusClass,
    getProjectStatusLabel,
    getProjectRoleLabel,
    formatDate,
}) {
    return (
        <div
            className={`user-project-history-group ${
                ended ? "ended-group" : ""
            }`}
        >
            <div className="user-project-history-group-header">
                <div className="user-project-history-group-title">
                    <span
                        className={`user-project-history-group-status-dot ${
                            ended ? "ended" : "active"
                        }`}
                    />

                    <span>{title}</span>

                    <strong>{histories.length}</strong>

                    <span>건</span>
                </div>
            </div>

            {histories.length ? (
                <div className="user-project-history-list">
                    {histories.map((history, index) => (
                        <div
                            className="user-project-history-item"
                            key={`${ended ? "ended" : "active"}-${
                                history.projectNo
                            }-${index}`}
                        >
                            <div className="user-project-history-number">
                                {index + 1}
                            </div>

                            <div className="user-project-history-icon">
                                P
                            </div>

                            <div className="user-project-history-main">
                                <div className="user-project-history-title-row">
                                    <div className="user-project-history-title">
                                        {history.projectName ||
                                            "프로젝트 이름 없음"}
                                    </div>

                                    <span
                                        className={`user-project-history-status ${getProjectStatusClass(
                                            history.projectStatus
                                        )}`}
                                    >
                                        <span className="user-project-history-status-dot" />

                                        {getProjectStatusLabel(
                                            history.projectStatus
                                        )}
                                    </span>
                                </div>

                                <div className="user-project-history-info">
                                    <span className="user-project-history-role">
                                        {getProjectRoleLabel(
                                            history.projectMemberRole
                                        )}
                                    </span>

                                    <span className="user-project-history-divider">
                                        ·
                                    </span>

                                    <span>
                                        {history.projectMemberJob ||
                                            "담당 업무 없음"}
                                    </span>
                                </div>
                            </div>

                            <div className="user-project-history-date">
                                <span>참여일</span>

                                <strong>
                                    {formatDate(
                                        history.projectMemberCtime
                                    )}
                                </strong>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                emptyText && (
                    <div className="user-project-history-group-empty">
                        {emptyText}
                    </div>
                )
            )}
        </div>
    );
}

/*
 * ==================================================
 * 검색 결과 섹션
 * ==================================================
 */
function SearchSection({ title, count, children }) {
    return (
        <section className="search-section">
            <div className="search-section-header">
                <h2>{title}</h2>
                <span>{count}</span>
            </div>

            {count === 0 ? (
                <div className="search-no-result">
                    검색결과가 없습니다.
                </div>
            ) : (
                <div className="search-result-list">
                    {children}
                </div>
            )}
        </section>
    );
}
