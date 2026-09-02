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
 * Search
 * ==========================================
 */

export default function Search() {

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();


    /*
     * 프로젝트 상세 페이지 이동
     */
    const navigate = useNavigate();


    /*
     * 검색어
     */
    const keyword =
        searchParams.get("keyword") || "";


    /*
     * URL filter
     *
     * filter가 없으면 전체 검색
     */
    const getFiltersFromUrl = () => {

        const filterParam =
            searchParams.get("filter");


        /*
         * filter가 없으면 전체
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
        return filterParam
            .split(",")
            .filter((filter) =>
                FILTER_KEYS.includes(filter)
            );

    };


    /*
     * 선택된 필터
     *
     * 최초에는 전체 검색
     */
    const [filters, setFilters] =
        useState(() => {

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


            /*
             * 이상한 filter가 들어온 경우
             * 전체 검색으로 처리
             */
            if (parsedFilters.length === 0) {

                return ["all"];

            }


            return parsedFilters;

        });


    /*
     * 검색 결과
     */
    const [result, setResult] = useState({

        keyword: "",

        filter: "all",

        users: [],

        projects: [],

        tasks: [],

        records: [],

        notes: [],

        files: [],

    });


    /*
     * 로딩
     */
    const [loading, setLoading] =
        useState(false);


    /*
     * 오류
     */
    const [error, setError] =
        useState("");


    /*
     * ==========================================
     * URL filter 변경 감지
     * ==========================================
     */

    useEffect(() => {

        const filterParam =
            searchParams.get("filter");


        /*
         * URL에 filter가 없으면
         * 전체 검색
         */
        if (!filterParam) {

            setFilters(["all"]);

            return;

        }


        /*
         * 전체
         */
        if (filterParam === "all") {

            setFilters(["all"]);

            return;

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
         * 유효한 필터가 없으면
         * 전체 검색
         */
        if (parsedFilters.length === 0) {

            setFilters(["all"]);

            return;

        }


        setFilters(parsedFilters);

    }, [
        searchParams
    ]);


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
             * 현재 전체가 체크되어 있으면
             * 전체 해제
             */
            if (isAllSelected) {

                nextFilters = [];

            }

            /*
             * 전체를 체크하면
             *
             * 다른 필터는 전부 해제
             *
             * 전체만 체크
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
             * 현재 전체가 체크되어 있다면
             *
             * 전체 해제
             * 클릭한 항목만 체크
             */
            if (isAllSelected) {

                nextFilters = [
                    filterKey,
                ];

            }


            /*
             * 이미 체크되어 있으면
             * 해당 항목만 해제
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
             * 체크되어 있지 않으면
             * 기존 선택에 추가
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
         * ======================================
         * URL 변경
         * ======================================
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
         * 아무것도 선택하지 않았다면
         * filter는 URL에서 제거
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
             * 검색어가 없는 경우
             */
            if (!keyword.trim()) {

                setResult({

                    keyword: "",

                    filter: "all",

                    users: [],

                    projects: [],

                    tasks: [],

                    records: [],

                    notes: [],

                    files: [],

                });

                setLoading(false);

                return;

            }


            /*
             * 아무 필터도 없는 경우
             */
            if (filters.length === 0) {

                setResult({

                    keyword,

                    filter: "",

                    users: [],

                    projects: [],

                    tasks: [],

                    records: [],

                    notes: [],

                    files: [],

                });

                setLoading(false);

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
                 * API 호출
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
                    왼쪽 필터
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
                                                        navigate(
                                                            `/projects/${project.projectNo}`
                                                        )
                                                    }
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {

                                                        if (
                                                            e.key ===
                                                            "Enter"
                                                        ) {

                                                            navigate(
                                                                `/projects/${project.projectNo}`
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
                                                                project.projectName
                                                            }
                                                        </div>

                                                        <div className="search-item-sub">
                                                            {
                                                                project.projectPurpose ||
                                                                ""
                                                            }
                                                        </div>

                                                    </div>


                                                    <div className="search-item-number">
                                                        #
                                                        {
                                                            project.projectNo
                                                        }
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
                                                    className="search-result-item"
                                                    key={
                                                        task.taskNo
                                                    }
                                                >

                                                    <div className="search-task-icon">
                                                        T
                                                    </div>


                                                    <div className="search-item-main">

                                                        <div className="search-item-title">
                                                            {
                                                                task.taskTitle
                                                            }
                                                        </div>

                                                        <div className="search-item-sub">
                                                            {
                                                                task.taskContent ||
                                                                ""
                                                            }
                                                        </div>

                                                    </div>


                                                    <div className="search-item-number">
                                                        #
                                                        {
                                                            task.taskNo
                                                        }
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
                                                    className="search-result-item"
                                                    key={
                                                        file.attachNo
                                                    }
                                                >

                                                    <div className="search-file-icon">
                                                        📎
                                                    </div>


                                                    <div className="search-item-main">

                                                        <div className="search-item-title">
                                                            {
                                                                file.attachName
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


                                                    <div className="search-item-number">
                                                        #
                                                        {
                                                            file.attachNo
                                                        }
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
