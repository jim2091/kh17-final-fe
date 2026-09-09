import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import "./Search.css";

const FILTER_OPTIONS = [ {key: "user", label: "사용자",},
    {key: "project", label: "프로젝트",},
    {key: "task",label: "업무",},
    {key: "record",label: "기록",},
    {key: "note",label: "노트",},
    {key: "file",label: "파일",},];
const FILTER_KEYS = FILTER_OPTIONS.map((option) => option.key);
const EMPTY_RESULT = {
    keyword: "", filter: "all",
    users: [], projects: [], tasks: [], records: [], notes: [], files: [],};
export default function Search() {
    const [searchParams,setSearchParams,] = useSearchParams();
    const navigate = useNavigate();
    const keyword = searchParams.get("keyword") || "";
    const getFiltersFromUrl = () => {
        const filterParam =
            searchParams.get("filter");
        if (!filterParam) {return ["all"];}
        if (filterParam === "all") {return ["all"];}
        const parsedFilters =
            filterParam
                .split(",")
                .filter((filter) =>
                    FILTER_KEYS.includes(filter)
                );
        if (parsedFilters.length === 0) {return ["all"];}
        return parsedFilters;};
    const [filters, setFilters] = useState(() => getFiltersFromUrl());
    const [result, setResult] = useState(EMPTY_RESULT);
    const [loading, setLoading] = useState(false);
    const [joiningProjectNo, setJoiningProjectNo] = useState(null);
    const [error, setError] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [projectHistory, setProjectHistory] =useState([]);
    const [projectHistoryLoading, setProjectHistoryLoading] = useState(false);
    const [projectHistoryError, setProjectHistoryError] = useState("");
    useEffect(() => {setFilters(getFiltersFromUrl());}, [searchParams]);
    const handleUserClick = async (user) => {
    setSelectedUser(user);
    setProjectHistory([]);
    setProjectHistoryError("");
    setProjectHistoryLoading(true);

    try {
        const response = await apiClient.get(
            `/search/user/${user.empNo}/projects`
        );

        console.log("=================================");
        console.log("프로젝트 이력 API 전체 응답");
        console.log(response);
        console.log("프로젝트 이력 API response.data");
        console.log(response.data);
        console.log("프로젝트 이력 response.data.projects");
        console.log(response.data?.projects);
        console.log("=================================");

        const projects = response.data?.projects;

        setProjectHistory(
            Array.isArray(projects)
                ? projects
                : []
        );

    } catch (error) {
        console.error("프로젝트 참여 이력 조회 실패:", error);
        console.error("에러 응답:", error.response?.data);

        setProjectHistoryError(
            "프로젝트 참여 이력을 불러오지 못했습니다."
        );

        setProjectHistory([]);
    } finally {
        setProjectHistoryLoading(false);
    }
};
const handleCloseUserModal = () => {
    setSelectedUser(null);
    setProjectHistory([]);
    setProjectHistoryError("");
    setProjectHistoryLoading(false);
};
    useEffect(() => {if (!selectedUser) {return;}
       const handleKeyDown = (e) => {if (e.key === "Escape") {handleCloseUserModal();}};
        document.addEventListener("keydown",handleKeyDown);
        return () => {document.removeEventListener("keydown",handleKeyDown);};}, [selectedUser]);
    useEffect(() => {if (!selectedUser) {return;}
        const originalOverflow =document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {document.body.style.overflow =originalOverflow;};
    }, [selectedUser]);
    const formatDate = (dateValue) => {if (!dateValue) {return "-";}
        const normalizedDate =typeof dateValue === "string" &&dateValue.includes(" ") ? dateValue.replace(" ", "T") : dateValue;
        const date = new Date(normalizedDate);
        if (Number.isNaN(date.getTime())) {return "-";}
        return date.toLocaleDateString("ko-KR",{year: "numeric",month: "2-digit",day: "2-digit",});};
    const isProjectActive = (status) => {
        const normalizedStatus =String(status ?? "").trim().toLowerCase();
        return normalizedStatus === "active";};
    const getProjectStatusLabel = (status) => {
        return isProjectActive(status) ? "진행 중" : "종료";};
    const getProjectStatusClass = (status) => {
        return isProjectActive(status) ? "active" : "ended";
    };
    const getProjectRoleLabel = (role) => {
        if (!role) {return "역할 없음";}
        const normalizedRole = role.toLowerCase();
        if (normalizedRole === "owner") {return "owner";}
        if (normalizedRole === "manager") {return "관리자";}
        if (normalizedRole === "member") {return "멤버";}
        return role;};
    const isAllSelected =filters.includes("all");
    const isSelected = (filterKey) => {return filters.includes(filterKey);};
    const handleFilterChange = (filterKey) => {let nextFilters = [];
            if (filterKey === "all") {if (isAllSelected) {nextFilters = [];}
            else {nextFilters = ["all"];}}
        else {if (isAllSelected) {nextFilters = [filterKey,];}else if (filters.includes(filterKey)) {
                    nextFilters = filters.filter((filter) =>filter !== filterKey);}
            else {nextFilters = [...filters,filterKey,];}}
        setFilters(nextFilters);
        const params = new URLSearchParams();
        if (keyword) {params.set("keyword",keyword);}
        if (nextFilters.length === 1 && nextFilters[0] === "all") {params.set("filter","all");}
        else if (nextFilters.length > 0) {params.set("filter",nextFilters.join(","));}
        setSearchParams(params);};
    useEffect(() => {const fetchSearch = async () => {
            if (!keyword.trim()) {setResult({...EMPTY_RESULT,});
                setLoading(false);
                setError("");
                return;}
            if (filters.length === 0) {setResult({...EMPTY_RESULT,keyword,filter: "",});
                setLoading(false);setError("");return;}
            try {setLoading(true);setError("");
                const filterParam = filters.includes("all") ? "all" : filters.join(",");
                const response = await apiClient.get("/search",{params: {keyword,filter: filterParam,},});
                setResult(response.data);}
            catch (e) {console.error("검색 실패:",e);
                setError("검색 중 오류가 발생했습니다.");}
            finally {setLoading(false);}};
        fetchSearch();}, [keyword,filters]);
    const totalCount =(result.users?.length || 0) +(result.projects?.length || 0) +(result.tasks?.length || 0) +
        (result.records?.length || 0) +(result.notes?.length || 0) +(result.files?.length || 0);
    const handleProjectClick = (projectNo,projectRole) => {if (!projectNo) {console.warn("프로젝트 번호가 없습니다.");return;}
        if (projectRole !== "owner" && projectRole !== "member") {return;}
        navigate(`/projects/${projectNo}`);};
    const handleProjectJoin = async (projectNo) => {if (!projectNo) {console.warn("프로젝트 번호가 없습니다.");return;}
        if (joiningProjectNo === projectNo) {return;}
        const confirmed =window.confirm("정말 이 프로젝트에 참여하시겠습니까?");


        if (!confirmed) {
            return;
        }


        try {

            setJoiningProjectNo(
                projectNo
            );


            await apiClient.post(
                `/project/${projectNo}/join`
            );


            /*
             * 검색 결과의 역할을
             * 즉시 member로 변경
             */

            setResult((prev) => ({

                ...prev,

                projects:
                    prev.projects?.map(
                        (project) => {

                            if (
                                project.projectNo ===
                                projectNo
                            ) {

                                return {

                                    ...project,

                                    projectRole:
                                        "member",

                                    memberCount:
                                        (project.memberCount || 0) + 1,

                                };

                            }


                            return project;

                        }
                    ) || [],

            }));

        }
        catch (e) {

            console.error(
                "프로젝트 참여 실패:",
                e
            );


            alert(
                e?.response?.data?.message ||
                "프로젝트 참여에 실패했습니다."
            );

        }
        finally {

            setJoiningProjectNo(null);

        }

    };


    /*
     * ==========================================
     * 업무 이동
     * ==========================================
     */

    const handleTaskClick = (
        projectNo
    ) => {

        if (!projectNo) {

            console.warn(
                "업무의 projectNo가 없습니다."
            );

            return;

        }


        navigate(
            `/projects/${projectNo}/task`
        );

    };


    /*
     * ==========================================
     * 파일 확장자
     * ==========================================
     */

    const getExtension = (
        fileName = ""
    ) => {

        const index =
            fileName.lastIndexOf(".");


        if (index === -1) {
            return "";
        }


        return fileName
            .substring(index + 1)
            .toLowerCase();

    };


    /*
     * ==========================================
     * 파일 종류
     * ==========================================
     */

    const getFileType = (
        fileName = ""
    ) => {

        const extension =
            getExtension(fileName);


        /*
         * 이미지
         */

        if (
            [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "webp",
                "svg",
                "bmp"
            ].includes(extension)
        ) {

            return "image";

        }


        /*
         * PDF
         */

        if (extension === "pdf") {
            return "pdf";
        }


        /*
         * Word
         */

        if (
            ["doc", "docx"].includes(
                extension
            )
        ) {

            return "word";

        }


        /*
         * Excel
         */

        if (
            ["xls", "xlsx"].includes(
                extension
            )
        ) {

            return "excel";

        }


        /*
         * PowerPoint
         */

        if (
            ["ppt", "pptx"].includes(
                extension
            )
        ) {

            return "powerpoint";

        }


        /*
         * ZIP
         */

        if (
            ["zip", "rar", "7z"].includes(
                extension
            )
        ) {

            return "zip";

        }


        return "file";

    };


    /*
     * ==========================================
     * 파일 URL
     * ==========================================
     */

    const getFileUrl = (
        attachNo
    ) => {

        if (!attachNo) {
            return "";
        }


        return `http://localhost:8080/api/attach/${attachNo}`;

    };


    /*
     * ==========================================
     * 검색 파일 아이콘
     * ==========================================
     */

    const SearchFileIcon = ({
        file
    }) => {

        const type =
            getFileType(
                file.attachName
            );


        /*
         * 이미지
         */

        if (type === "image") {

            return (

                <div className="search-file-thumbnail">

                    <img
                        src={getFileUrl(
                            file.attachNo
                        )}
                        alt={
                            file.attachName ||
                            "이미지"
                        }
                        onError={(e) => {

                            e.currentTarget.style.display =
                                "none";


                            if (
                                e.currentTarget
                                    .nextElementSibling
                            ) {

                                e.currentTarget
                                    .nextElementSibling
                                    .style.display =
                                    "flex";

                            }

                        }}
                    />


                    <div className="search-file-thumbnail-fallback">

                        <span>
                            이미지 없음
                        </span>

                    </div>

                </div>

            );

        }


        /*
         * PDF
         */

        if (type === "pdf") {

            return (

                <div className="search-file-icon search-file-icon-pdf">

                    <span>
                        PDF
                    </span>

                </div>

            );

        }


        /*
         * Word
         */

        if (type === "word") {

            return (

                <div className="search-file-icon search-file-icon-word">

                    <span>
                        W
                    </span>

                </div>

            );

        }


        /*
         * Excel
         */

        if (type === "excel") {

            return (

                <div className="search-file-icon search-file-icon-excel">

                    <span>
                        X
                    </span>

                </div>

            );

        }


        /*
         * PowerPoint
         */

        if (type === "powerpoint") {

            return (

                <div className="search-file-icon search-file-icon-powerpoint">

                    <span>
                        P
                    </span>

                </div>

            );

        }


        /*
         * ZIP
         */

        if (type === "zip") {

            return (

                <div className="search-file-icon search-file-icon-zip">

                    <span>
                        ZIP
                    </span>

                </div>

            );

        }


        /*
         * 일반 파일
         */

        return (

            <div className="search-file-icon search-file-icon-default">

                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                >

                    <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    />

                    <path
                        d="M14 2v6h6"
                    />

                </svg>

            </div>

        );

    };


    /*
     * ==========================================
     * 진행 중 프로젝트
     * ==========================================
     */

    const activeProjectHistory =
        projectHistory.filter(
            (history) =>
                isProjectActive(
                    history.projectStatus
                )
        );


    /*
     * ==========================================
     * 종료된 프로젝트
     * ==========================================
     */

    const endedProjectHistory =
        projectHistory.filter(
            (history) =>
                !isProjectActive(
                    history.projectStatus
                )
        );


    /*
     * ==========================================
     * 화면
     * ==========================================
     */

    return (

        <div className="search-page">


            {/* =================================
                페이지 제목
            ================================= */}

            <div className="search-page-header">

                <h1 className="search-page-title">
                    검색
                </h1>

            </div>


            {/* =================================
                검색 본문
            ================================= */}

            <div className="search-content">


                {/* =================================
                    왼쪽 검색 필터
                ================================= */}

                <aside className="search-filter">

                    <div className="search-filter-title">
                        검색대상
                    </div>


                    <div className="search-filter-list">

                        <label className="search-filter-item">

                            <input
                                type="checkbox"
                                checked={
                                    isAllSelected
                                }
                                onChange={() =>
                                    handleFilterChange(
                                        "all"
                                    )
                                }
                            />

                            <span>
                                전체
                            </span>

                        </label>


                        {FILTER_OPTIONS.map(
                            (option) => (

                                <label
                                    key={option.key}
                                    className="search-filter-item"
                                >

                                    <input
                                        type="checkbox"
                                        checked={
                                            isSelected(
                                                option.key
                                            )
                                        }
                                        onChange={() =>
                                            handleFilterChange(
                                                option.key
                                            )
                                        }
                                    />

                                    <span>
                                        {
                                            option.label
                                        }
                                    </span>

                                </label>

                            )
                        )}

                    </div>

                </aside>


                {/* =================================
                    오른쪽 검색 결과
                ================================= */}

                <main className="search-result">


                    {/* =================================
                        검색어
                    ================================= */}

                    {keyword && (

                        <div className="search-page-keyword">

                            <span>
                                검색어
                            </span>

                            <strong>
                                "{keyword}"
                            </strong>

                        </div>

                    )}


                    {/* =================================
                        검색 결과 개수
                    ================================= */}

                    {keyword &&
                        filters.length > 0 &&
                        !loading &&
                        !error && (

                            <div className="search-result-summary">

                                검색 결과{" "}

                                <strong>
                                    {totalCount}
                                </strong>

                                개

                            </div>

                        )}


                    {/* =================================
                        검색어 없음
                    ================================= */}

                    {!keyword && (

                        <div className="search-empty-page">

                            <div className="search-empty-icon">
                                🔍
                            </div>

                            <h2>
                                검색어를 입력해주세요.
                            </h2>

                            <p>
                                상단 검색창에서 원하는 검색어를 입력해주세요.
                            </p>

                        </div>

                    )}


                    {/* =================================
                        필터 미선택
                    ================================= */}

                    {keyword &&
                        filters.length === 0 && (

                            <div className="search-filter-empty">

                                <div className="search-filter-empty-icon">
                                    ☑
                                </div>

                                <h2>
                                    검색 대상을 선택해주세요.
                                </h2>

                                <p>
                                    왼쪽에서 검색할 대상을 하나 이상 선택해주세요.
                                </p>

                            </div>

                        )}


                    {/* =================================
                        로딩
                    ================================= */}

                    {keyword &&
                        filters.length > 0 &&
                        loading && (

                            <div className="search-status">
                                검색 중입니다...
                            </div>

                        )}


                    {/* =================================
                        오류
                    ================================= */}

                    {keyword &&
                        filters.length > 0 &&
                        !loading &&
                        error && (

                            <div className="search-error">
                                {error}
                            </div>

                        )}


                    {/* =================================
                        검색 결과
                    ================================= */}

                    {keyword &&
                        filters.length > 0 &&
                        !loading &&
                        !error && (

                            <div className="search-result-list-container">


                                {/* =================================
                                    사용자
                                ================================= */}

                                {(
                                    isAllSelected ||
                                    isSelected("user")
                                ) && (

                                        <SearchSection
                                            title="사용자"
                                            count={
                                                result.users?.length || 0
                                            }
                                        >

                                            {result.users?.map(
                                                (user) => (

                                                    <div
                                                        className="search-result-item search-user-result-item"
                                                        key={
                                                            user.empNo
                                                        }

                                                        onClick={() =>
                                                            handleUserClick(
                                                                user
                                                            )
                                                        }

                                                        role="button"
                                                        tabIndex={0}

                                                        onKeyDown={(e) => {

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

                                                        <div className="search-user-avatar">

                                                            {
                                                                user.empName?.charAt(
                                                                    0
                                                                ) || "?"
                                                            }

                                                        </div>


                                                        <div className="search-item-main">

                                                            <div className="search-item-title">

                                                                {
                                                                    user.empName ||
                                                                    "이름 없음"
                                                                }

                                                            </div>


                                                            <div className="search-item-sub">

                                                                {
                                                                    user.empEmail ||
                                                                    ""
                                                                }

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

                                                )
                                            )}

                                        </SearchSection>

                                    )}


                                {/* =================================
                                    프로젝트
                                ================================= */}

                                {(
                                    isAllSelected ||
                                    isSelected("project")
                                ) && (

                                        <SearchSection
                                            title="프로젝트"
                                            count={
                                                result.projects?.length || 0
                                            }
                                        >

                                            {result.projects?.map(
                                                (project) => (

                                                    <div
                                                        className={`search-result-item search-project-result-item ${project.projectRole === "owner" ||
                                                            project.projectRole === "member"
                                                            ? "project-clickable"
                                                            : "project-not-member"
                                                            }`}
                                                        key={
                                                            project.projectNo
                                                        }

                                                        onClick={() =>
                                                            handleProjectClick(
                                                                project.projectNo,
                                                                project.projectRole
                                                            )
                                                        }

                                                        role="button"
                                                        tabIndex={
                                                            project.projectRole === "owner" ||
                                                                project.projectRole === "member"
                                                                ? 0
                                                                : -1
                                                        }

                                                        onKeyDown={(e) => {

                                                            if (
                                                                e.key === "Enter" &&
                                                                (
                                                                    project.projectRole === "owner" ||
                                                                    project.projectRole === "member"
                                                                )
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

                                                                    {
                                                                        project.projectName ||
                                                                        "프로젝트 이름 없음"
                                                                    }

                                                                </div>


                                                                <span className="project-member-count">

                                                                    참여 :{" "}

                                                                    {
                                                                        project.memberCount ?? 0
                                                                    }

                                                                    명

                                                                </span>

                                                            </div>


                                                            <div className="search-item-sub">

                                                                {
                                                                    project.projectPurpose ||
                                                                    ""
                                                                }

                                                            </div>

                                                        </div>


                                                        <div
                                                            className="search-project-action"

                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >

                                                            {project.projectRole === "owner" && (

                                                                <span className="project-role owner">
                                                                    owner
                                                                </span>

                                                            )}


                                                            {project.projectRole === "member" && (

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

                                                                    {
                                                                        joiningProjectNo ===
                                                                            project.projectNo
                                                                            ? "참여 중..."
                                                                            : "참여"
                                                                    }

                                                                </button>

                                                            )}

                                                        </div>

                                                    </div>

                                                )
                                            )}

                                        </SearchSection>

                                    )}


                                {/* =================================
                                    업무
                                ================================= */}

                                {(
                                    isAllSelected ||
                                    isSelected("task")
                                ) && (

                                        <SearchSection
                                            title="업무"
                                            count={
                                                result.tasks?.length || 0
                                            }
                                        >

                                            {result.tasks?.map(
                                                (task) => (

                                                    <div
                                                        className="search-result-item search-task-result-item"
                                                        key={
                                                            task.taskNo
                                                        }

                                                        onClick={() =>
                                                            handleTaskClick(
                                                                task.projectNo
                                                            )
                                                        }

                                                        role="button"
                                                        tabIndex={0}

                                                        onKeyDown={(e) => {

                                                            if (
                                                                e.key === "Enter"
                                                            ) {

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

                                                                {
                                                                    task.projectName ||
                                                                    "프로젝트 없음"
                                                                }

                                                            </div>


                                                            <div className="search-item-title">

                                                                {
                                                                    task.taskTitle ||
                                                                    "업무 이름 없음"
                                                                }

                                                            </div>


                                                            <div className="search-item-sub">

                                                                {
                                                                    task.taskContent ||
                                                                    ""
                                                                }

                                                            </div>

                                                        </div>

                                                    </div>

                                                )
                                            )}

                                        </SearchSection>

                                    )}


                                {/* =================================
                                    기록
                                ================================= */}

                                {(
                                    isAllSelected ||
                                    isSelected("record")
                                ) && (

                                        <SearchSection
                                            title="기록"
                                            count={
                                                result.records?.length || 0
                                            }
                                        >

                                            {result.records?.map(
                                                (
                                                    record,
                                                    index
                                                ) => (

                                                    <div
                                                        className="search-result-item"
                                                        key={
                                                            record.id ||
                                                            index
                                                        }
                                                    >

                                                        <div className="search-item-main">

                                                            <div className="search-item-title">

                                                                {
                                                                    record.title ||
                                                                    "기록"
                                                                }

                                                            </div>

                                                        </div>

                                                    </div>

                                                )
                                            )}

                                        </SearchSection>

                                    )}


                                {/* =================================
                                    노트
                                ================================= */}

                                {(
                                    isAllSelected ||
                                    isSelected("note")
                                ) && (

                                        <SearchSection
                                            title="노트"
                                            count={
                                                result.notes?.length || 0
                                            }
                                        >

                                            {result.notes?.map(
                                                (
                                                    note,
                                                    index
                                                ) => (

                                                    <div
                                                        className="search-result-item"
                                                        key={
                                                            note.id ||
                                                            index
                                                        }
                                                    >

                                                        <div className="search-item-main">

                                                            <div className="search-item-title">

                                                                {
                                                                    note.title ||
                                                                    "노트"
                                                                }

                                                            </div>

                                                        </div>

                                                    </div>

                                                )
                                            )}

                                        </SearchSection>

                                    )}


                                {/* =================================
                                    파일
                                ================================= */}

                                {(
                                    isAllSelected ||
                                    isSelected("file")
                                ) && (

                                        <SearchSection
                                            title="파일"
                                            count={
                                                result.files?.length || 0
                                            }
                                        >

                                            {result.files?.map(
                                                (file) => (

                                                    <div
                                                        className="search-result-item search-file-result-item"
                                                        key={
                                                            file.attachNo
                                                        }
                                                    >

                                                        <SearchFileIcon
                                                            file={file}
                                                        />


                                                        <div className="search-item-main">

                                                            <div className="search-item-project">

                                                                {
                                                                    file.projectName ||
                                                                    "프로젝트 없음"
                                                                }

                                                            </div>


                                                            <div className="search-item-title">

                                                                {
                                                                    file.attachName ||
                                                                    "파일 이름 없음"
                                                                }

                                                            </div>


                                                            <div className="search-item-sub">

                                                                {file.empName && (

                                                                    <>

                                                                        {
                                                                            file.empName
                                                                        }

                                                                        {" · "}

                                                                    </>

                                                                )}

                                                                {
                                                                    file.attachType ||
                                                                    ""
                                                                }

                                                            </div>

                                                        </div>

                                                    </div>

                                                )
                                            )}

                                        </SearchSection>

                                    )}

                            </div>

                        )}

                </main>

            </div>


            {/* ==========================================
                사용자 프로젝트 이력 팝업
            ========================================== */}

            {selectedUser && (

                <div
                    className="user-project-modal-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target ===
                            e.currentTarget
                        ) {

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


                        {/* =================================
                            팝업 헤더
                        ================================= */}

                        <div className="user-project-modal-header">

                            <div className="user-project-modal-user">

                                <div className="user-project-modal-avatar">

                                    {
                                        selectedUser.empName?.charAt(
                                            0
                                        ) || "?"
                                    }

                                </div>


                                <div>

                                    <h2
                                        id="user-project-modal-title"
                                        className="user-project-modal-title"
                                    >

                                        {
                                            selectedUser.empName ||
                                            "이름 없음"
                                        }

                                    </h2>


                                    <div className="user-project-modal-email">

                                        {
                                            selectedUser.empEmail ||
                                            ""
                                        }

                                    </div>

                                </div>

                            </div>


                            <button
                                type="button"
                                className="user-project-modal-close"
                                onClick={
                                    handleCloseUserModal
                                }
                                aria-label="닫기"
                            >

                                ×

                            </button>

                        </div>


                        {/* =================================
                            팝업 본문
                        ================================= */}

                        <div className="user-project-modal-body">


                            {/* =================================
                                로딩
                            ================================= */}

                            {projectHistoryLoading && (

                                <div className="user-project-modal-status">

                                    <div className="user-project-loading-spinner" />

                                    <span>
                                        프로젝트 이력을 불러오는 중입니다...
                                    </span>

                                </div>

                            )}


                            {/* =================================
                                오류
                            ================================= */}

                            {!projectHistoryLoading &&
                                projectHistoryError && (

                                    <div className="user-project-modal-error">

                                        <div className="user-project-modal-error-icon">
                                            !
                                        </div>

                                        <p>
                                            {
                                                projectHistoryError
                                            }
                                        </p>

                                    </div>

                                )}


                            {/* =================================
                                프로젝트 없음
                            ================================= */}

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
                                            해당 사용자의 프로젝트 참여 기록이 없습니다.
                                        </p>

                                    </div>

                                )}


                            {/* =================================
                                프로젝트 이력
                            ================================= */}

                            {!projectHistoryLoading &&
                                !projectHistoryError &&
                                projectHistory.length > 0 && (

                                    <div className="user-project-history-groups">


                                        {/* =================================
                                            진행 중 프로젝트
                                        ================================= */}

                                        <div className="user-project-history-group">

                                            <div className="user-project-history-group-header">

                                                <div className="user-project-history-group-title">

                                                    <span className="user-project-history-group-status-dot active" />

                                                    <span>
                                                        진행 중인 프로젝트
                                                    </span>

                                                    <strong>
                                                        {
                                                            activeProjectHistory.length
                                                        }
                                                    </strong>

                                                    <span>
                                                        건
                                                    </span>

                                                </div>

                                            </div>


                                            {activeProjectHistory.length > 0 ? (

                                                <div className="user-project-history-list">

                                                    {activeProjectHistory.map(
                                                        (
                                                            history,
                                                            index
                                                        ) => (

                                                            <div
                                                                className="user-project-history-item"
                                                                key={`active-${history.projectNo}-${index}`}
                                                            >

                                                                <div className="user-project-history-number">

                                                                    {
                                                                        index + 1
                                                                    }

                                                                </div>


                                                                <div className="user-project-history-icon">

                                                                    P

                                                                </div>


                                                                <div className="user-project-history-main">

                                                                    <div className="user-project-history-title-row">

                                                                        <div className="user-project-history-title">

                                                                            {
                                                                                history.projectName ||
                                                                                "프로젝트 이름 없음"
                                                                            }

                                                                        </div>


                                                                        <span
                                                                            className={`user-project-history-status ${getProjectStatusClass(
                                                                                history.projectStatus
                                                                            )}`}
                                                                        >

                                                                            <span className="user-project-history-status-dot" />

                                                                            {
                                                                                getProjectStatusLabel(
                                                                                    history.projectStatus
                                                                                )
                                                                            }

                                                                        </span>

                                                                    </div>


                                                                    <div className="user-project-history-info">

                                                                        <span className="user-project-history-role">

                                                                            {
                                                                                getProjectRoleLabel(
                                                                                    history.projectMemberRole
                                                                                )
                                                                            }

                                                                        </span>


                                                                        <span className="user-project-history-divider">
                                                                            ·
                                                                        </span>


                                                                        <span>

                                                                            {
                                                                                history.projectMemberJob ||
                                                                                "담당 업무 없음"
                                                                            }

                                                                        </span>

                                                                    </div>

                                                                </div>


                                                                <div className="user-project-history-date">

                                                                    <span>
                                                                        참여일
                                                                    </span>

                                                                    <strong>

                                                                        {
                                                                            formatDate(
                                                                                history.projectMemberCtime
                                                                            )
                                                                        }

                                                                    </strong>

                                                                </div>

                                                            </div>

                                                        )
                                                    )}

                                                </div>

                                            ) : (

                                                <div className="user-project-history-group-empty">

                                                    현재 진행 중인 프로젝트가 없습니다.

                                                </div>

                                            )}

                                        </div>

                                        <hr />
                                        {/* =================================
                                            종료된 프로젝트
                                        ================================= */}

                                        <div className="user-project-history-group ended-group">

                                            <div className="user-project-history-group-header">

                                                <div className="user-project-history-group-title">

                                                    <span className="user-project-history-group-status-dot ended" />

                                                    <span>
                                                        종료된 프로젝트
                                                    </span>

                                                    <strong>
                                                        {
                                                            endedProjectHistory.length
                                                        }
                                                    </strong>

                                                    <span>
                                                        건
                                                    </span>

                                                </div>

                                            </div>





                                            <div className="user-project-history-list">

                                                {endedProjectHistory.map(
                                                    (
                                                        history,
                                                        index
                                                    ) => (

                                                        <div
                                                            className="user-project-history-item"
                                                            key={`ended-${history.projectNo}-${index}`}
                                                        >

                                                            <div className="user-project-history-number">

                                                                {
                                                                    index + 1
                                                                }

                                                            </div>


                                                            <div className="user-project-history-icon">

                                                                P

                                                            </div>


                                                            <div className="user-project-history-main">

                                                                <div className="user-project-history-title-row">

                                                                    <div className="user-project-history-title">

                                                                        {
                                                                            history.projectName ||
                                                                            "프로젝트 이름 없음"
                                                                        }

                                                                    </div>


                                                                    <span
                                                                        className={`user-project-history-status ${getProjectStatusClass(
                                                                            history.projectStatus
                                                                        )}`}
                                                                    >

                                                                        <span className="user-project-history-status-dot" />

                                                                        {
                                                                            getProjectStatusLabel(
                                                                                history.projectStatus
                                                                            )
                                                                        }

                                                                    </span>

                                                                </div>


                                                                <div className="user-project-history-info">

                                                                    <span className="user-project-history-role">

                                                                        {
                                                                            getProjectRoleLabel(
                                                                                history.projectMemberRole
                                                                            )
                                                                        }

                                                                    </span>


                                                                    <span className="user-project-history-divider">
                                                                        ·
                                                                    </span>


                                                                    <span>

                                                                        {
                                                                            history.projectMemberJob ||
                                                                            "담당 업무 없음"
                                                                        }

                                                                    </span>

                                                                </div>

                                                            </div>


                                                            <div className="user-project-history-date">

                                                                <span>
                                                                    참여일
                                                                </span>

                                                                <strong>

                                                                    {
                                                                        formatDate(
                                                                            history.projectMemberCtime
                                                                        )
                                                                    }

                                                                </strong>

                                                            </div>

                                                        </div>

                                                    )
                                                )}

                                            </div>


                                        </div>

                                    </div>

                                )}

                        </div>


                        {/* =================================
                            팝업 하단
                        ================================= */}

                        <div className="user-project-modal-footer">

                            <span>

                                진행 중{" "}

                                <strong>
                                    {
                                        activeProjectHistory.length
                                    }
                                </strong>

                                {" · "}

                                종료{" "}

                                <strong>
                                    {
                                        endedProjectHistory.length
                                    }
                                </strong>

                                {" · "}

                                총{" "}

                                <strong>
                                    {
                                        projectHistory.length
                                    }
                                </strong>

                                개의 프로젝트

                            </span>


                            <button
                                type="button"
                                onClick={
                                    handleCloseUserModal
                                }
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
 * ==========================================
 * 검색 결과 섹션
 * ==========================================
 */

function SearchSection({
    title,
    count,
    children,
}) {

    return (

        <section className="search-section">

            <div className="search-section-header">

                <h2>
                    {title}
                </h2>

                <span>
                    {count}
                </span>

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