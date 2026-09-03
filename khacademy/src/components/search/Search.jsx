
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


    /*
     * 페이지 이동
     */
    const navigate = useNavigate();


    /*
     * 검색어
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


        /*
         * filter 없음
         * → 전체
         */
        if (!filterParam) {
            return ["all"];
        }


        /*
         * 전체
         */
        if (filterParam === "all") {
            return ["all"];
        }


        /*
         * 개별 필터
         */
        const parsedFilters =
            filterParam
                .split(",")
                .filter((filter) =>
                    FILTER_KEYS.includes(filter)
                );


        /*
         * 잘못된 필터
         * → 전체
         */
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
         * ======================================
         * 전체
         * ======================================
         */

        if (filterKey === "all") {

            /*
             * 전체가 체크되어 있으면
             * 전체 해제
             */
            if (isAllSelected) {

                nextFilters = [];

            }

            /*
             * 전체를 체크하면
             * 전체만 선택
             */
            else {

                nextFilters = ["all"];

            }

        }


        /*
         * ======================================
         * 개별 필터
         * ======================================
         */

        else {

            /*
             * 전체가 선택되어 있으면
             * 전체 해제 후 현재 항목 선택
             */
            if (isAllSelected) {

                nextFilters = [
                    filterKey,
                ];

            }

            /*
             * 이미 선택되어 있으면
             * 해당 항목 제거
             */
            else if (
                filters.includes(filterKey)
            ) {

                nextFilters =
                    filters.filter(
                        (filter) =>
                            filter !== filterKey
                    );

            }

            /*
             * 선택되어 있지 않으면
             * 추가
             */
            else {

                nextFilters = [
                    ...filters,
                    filterKey,
                ];

            }

        }


        /*
         * 상태 변경
         */
        setFilters(nextFilters);


        /*
         * ==========================================
         * URL 변경
         * ==========================================
         */

        const params =
            new URLSearchParams();


        /*
         * 검색어 유지
         */
        if (keyword) {

            params.set(
                "keyword",
                keyword
            );

        }


        /*
         * 전체
         */
        if (
            nextFilters.length === 1 &&
            nextFilters[0] === "all"
        ) {

            params.set(
                "filter",
                "all"
            );

        }


        /*
         * 개별 필터
         */
        else if (
            nextFilters.length > 0
        ) {

            params.set(
                "filter",
                nextFilters.join(",")
            );

        }


        /*
         * 아무것도 선택하지 않으면
         * filter를 URL에서 제거
         */
        setSearchParams(params);

    };


    /*
     * ==========================================
     * 검색 API
     * ==========================================
     */

    useEffect(() => {

        const fetchSearch = async () => {

            /*
             * 검색어 없음
             */
            if (!keyword.trim()) {

                setResult({
                    ...EMPTY_RESULT,
                });

                setLoading(false);
                setError("");

                return;

            }


            /*
             * 필터 없음
             */
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


                /*
                 * 전체
                 */
                const filterParam =
                    filters.includes("all")
                        ? "all"
                        : filters.join(",");


                /*
                 * 검색 API
                 */
                const response =
                    await apiClient.get(
                        "/search",
                        {
                            params: {
                                keyword:
                                    keyword,

                                filter:
                                    filterParam,
                            },
                        }
                    );


                /*
                 * 검색 결과 저장
                 */
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


                        {/* =================================
                            전체
                        ================================= */}

                        <label
                            className="search-filter-item"
                        >

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


                        {/* =================================
                            개별 필터
                        ================================= */}

                        {FILTER_OPTIONS.map(
                            (option) => (

                                <label
                                    key={
                                        option.key
                                    }

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

                                                        <div className="search-item-title">

                                                            {
                                                                project.projectName ||
                                                                "프로젝트 이름 없음"
                                                            }

                                                        </div>


                                                        <div className="search-item-sub">

                                                            {
                                                                project.projectPurpose ||
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

                                                        {/* 프로젝트명 */}

                                                        <div className="search-item-project">

                                                            {
                                                                task.projectName ||
                                                                "프로젝트 없음"
                                                            }

                                                        </div>


                                                        {/* 업무 제목 */}

                                                        <div className="search-item-title">

                                                            {
                                                                task.taskTitle ||
                                                                "업무 이름 없음"
                                                            }

                                                        </div>


                                                        {/* 업무 내용 */}

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

                                                    <div className="search-file-icon">
                                                        📎
                                                    </div>


                                                    <div className="search-item-main">


                                                        {/* 프로젝트명 */}

                                                        <div className="search-item-project">

                                                            {
                                                                file.projectName ||
                                                                "프로젝트 없음"
                                                            }

                                                        </div>


                                                        {/* 파일명 */}

                                                        <div className="search-item-title">

                                                            {
                                                                file.attachName ||
                                                                "파일 이름 없음"
                                                            }

                                                        </div>


                                                        {/* 업로더 / 파일 타입 */}

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


            {/* 섹션 제목 */}

            <div className="search-section-header">

                <h2>
                    {title}
                </h2>

                <span>
                    {count}
                </span>

            </div>


            {/* 결과 */}

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

