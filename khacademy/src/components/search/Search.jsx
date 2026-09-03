import { useEffect, useState } from "react";
import {
    useSearchParams,
    useNavigate,
} from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import "./Search.css";


/*
 * ==========================================
 * 검색 필터
 * ==========================================
 */

const FILTER_OPTIONS = [
    {
        key: "user",
        label: "사용자",
    },
    {
        key: "project",
        label: "프로젝트",
    },
    {
        key: "task",
        label: "업무",
    },
    {
        key: "record",
        label: "기록",
    },
    {
        key: "note",
        label: "노트",
    },
    {
        key: "file",
        label: "파일",
    },
];


const FILTER_KEYS = FILTER_OPTIONS.map(
    (option) => option.key
);


/*
 * ==========================================
 * 빈 결과 객체
 * ==========================================
 */

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


/*
 * ==========================================
 * Search
 * ==========================================
 */

export default function Search() {

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    const navigate = useNavigate();


    /*
     * ==========================================
     * 검색어
     * ==========================================
     */

    const keyword =
        searchParams.get("keyword") || "";


    /*
     * ==========================================
     * URL에서 필터 가져오기
     * ==========================================
     */

    const getFiltersFromUrl = () => {

        const filterParam =
            searchParams.get("filter");


        if (!filterParam) {
            return ["all"];
        }


        if (filterParam === "all") {
            return ["all"];
        }


        const parsedFilters =
            filterParam
                .split(",")
                .filter((filter) =>
                    FILTER_KEYS.includes(filter)
                );


        if (parsedFilters.length === 0) {
            return ["all"];
        }


        return parsedFilters;
    };


    /*
     * ==========================================
     * 선택된 필터
     * ==========================================
     */

    const [filters, setFilters] =
        useState(() => getFiltersFromUrl());


    /*
     * ==========================================
     * 검색 결과
     * ==========================================
     */

    const [result, setResult] =
        useState(EMPTY_RESULT);


    /*
     * ==========================================
     * 로딩
     * ==========================================
     */

    const [loading, setLoading] =
        useState(false);


    /*
     * ==========================================
     * 프로젝트 참여 처리 중
     * ==========================================
     */

    const [joiningProjectNo, setJoiningProjectNo] =
        useState(null);


    /*
     * ==========================================
     * 오류
     * ==========================================
     */

    const [error, setError] =
        useState("");


    /*
     * ==========================================
     * URL filter 변경 감지
     * ==========================================
     */

    useEffect(() => {

        setFilters(
            getFiltersFromUrl()
        );

    }, [searchParams]);


    /*
     * ==========================================
     * 전체 선택 여부
     * ==========================================
     */

    const isAllSelected =
        filters.includes("all");


    /*
     * ==========================================
     * 특정 필터 선택 여부
     * ==========================================
     */

    const isSelected = (filterKey) => {

        return filters.includes(filterKey);

    };


    /*
     * ==========================================
     * 필터 변경
     * ==========================================
     */

    const handleFilterChange = (
        filterKey
    ) => {

        let nextFilters = [];


        /*
         * 전체
         */

        if (filterKey === "all") {

            if (isAllSelected) {
                nextFilters = [];
            }
            else {
                nextFilters = ["all"];
            }

        }


        /*
         * 개별 필터
         */

        else {

            if (isAllSelected) {

                nextFilters = [
                    filterKey,
                ];

            }
            else if (
                filters.includes(filterKey)
            ) {

                nextFilters =
                    filters.filter(
                        (filter) =>
                            filter !== filterKey
                    );

            }
            else {

                nextFilters = [
                    ...filters,
                    filterKey,
                ];

            }

        }


        setFilters(nextFilters);


        /*
         * URL 변경
         */

        const params =
            new URLSearchParams();


        if (keyword) {

            params.set(
                "keyword",
                keyword
            );

        }


        if (
            nextFilters.length === 1 &&
            nextFilters[0] === "all"
        ) {

            params.set(
                "filter",
                "all"
            );

        }
        else if (
            nextFilters.length > 0
        ) {

            params.set(
                "filter",
                nextFilters.join(",")
            );

        }


        setSearchParams(params);
    };


    /*
     * ==========================================
     * 검색 API
     * ==========================================
     */

    useEffect(() => {

        const fetchSearch = async () => {

            if (!keyword.trim()) {

                setResult({
                    ...EMPTY_RESULT,
                });

                setLoading(false);
                setError("");

                return;
            }


            if (filters.length === 0) {

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


                const filterParam =
                    filters.includes("all")
                        ? "all"
                        : filters.join(",");


                const response =
                    await apiClient.get(
                        "/search",
                        {
                            params: {
                                keyword,
                                filter: filterParam,
                            },
                        }
                    );


                setResult(
                    response.data
                );

            }
            catch (e) {

                console.error(
                    "검색 실패:",
                    e
                );

                setError(
                    "검색 중 오류가 발생했습니다."
                );

            }
            finally {

                setLoading(false);

            }

        };


        fetchSearch();

    }, [
        keyword,
        filters
    ]);


    /*
     * ==========================================
     * 전체 검색 결과 개수
     * ==========================================
     */

    const totalCount =
        (result.users?.length || 0) +
        (result.projects?.length || 0) +
        (result.tasks?.length || 0) +
        (result.records?.length || 0) +
        (result.notes?.length || 0) +
        (result.files?.length || 0);


    /*
     * ==========================================
     * 프로젝트 이동
     * ==========================================
     */

    const handleProjectClick = (
        projectNo
    ) => {

        if (!projectNo) {

            console.warn(
                "프로젝트 번호가 없습니다."
            );

            return;
        }


        navigate(
            `/projects/${projectNo}`
        );
    };


    /*
     * ==========================================
     * 프로젝트 참여
     * ==========================================
     */

    const handleProjectJoin = async (
        projectNo
    ) => {

        if (!projectNo) {

            console.warn(
                "프로젝트 번호가 없습니다."
            );

            return;
        }


        if (joiningProjectNo === projectNo) {
            return;
        }


        /*
         * 참여 확인
         */

        const confirmed =
            window.confirm(
                "정말 이 프로젝트에 참여하시겠습니까?"
            );


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
             *
             * 참여 인원도 +1
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
         * 이미지 파일
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
                                                    className="search-result-item"
                                                    key={
                                                        user.empNo
                                                    }
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
                                                    className="search-result-item search-project-result-item"
                                                    key={
                                                        project.projectNo
                                                    }

                                                    onClick={() =>
                                                        handleProjectClick(
                                                            project.projectNo
                                                        )
                                                    }

                                                    role="button"
                                                    tabIndex={0}

                                                    onKeyDown={(e) => {

                                                        if (
                                                            e.key === "Enter"
                                                        ) {

                                                            handleProjectClick(
                                                                project.projectNo
                                                            );

                                                        }

                                                    }}
                                                >

                                                    <div className="search-project-icon">
                                                        P
                                                    </div>


                                                    <div className="search-item-main">

                                                        {/* 프로젝트명 */}

                                                        <div className="search-project-title-row">

                                                            <div className="search-item-title">

                                                                {
                                                                    project.projectName ||
                                                                    "프로젝트 이름 없음"
                                                                }

                                                            </div>


                                                            {/* 참여 인원 */}

                                                            <span className="project-member-count">

                                                                참여 :{" "}

                                                                {
                                                                    project.memberCount ?? 0
                                                                }

                                                                명

                                                            </span>

                                                        </div>


                                                        {/* 프로젝트 목적 */}

                                                        <div className="search-item-sub">

                                                            {
                                                                project.projectPurpose ||
                                                                ""
                                                            }

                                                        </div>

                                                    </div>


                                                    {/* 프로젝트 참여 상태 */}

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