
import { useEffect, useRef, useState } from "react";
import {
    useNavigate,
    useOutletContext,
    useParams,
} from "react-router-dom";
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import "./Files.css";
import RecordLinkModal from "../records/RecordLinkModal";

/*
 * ==========================================
 * 파일 출처
 * ==========================================
 */

const SOURCE_LABEL = {
    FILE: "파일함",
    NOTE: "노트",
    NOTE_COMMENT: "노트 댓글",
    TASK: "업무",
    TASK_COMMENT: "업무 댓글",
    PROFILE: "프로필",
};

/*
 * ==========================================
 * 검색
 * ==========================================
 */

const SEARCH_TYPE_LABEL = {
    name: "파일명",
    source: "출처",
    uploader: "업로더",
    type: "파일 형태",
};

const SEARCH_TYPE_OPTIONS = [
    { value: "name", label: "파일명" },
    { value: "source", label: "출처" },
    { value: "uploader", label: "업로더" },
    { value: "type", label: "파일 형태" },
];

const SOURCE_SEARCH_OPTIONS = [
    { value: "TASK", label: "업무" },
    { value: "TASK_COMMENT", label: "업무 댓글" },
    { value: "NOTE", label: "노트" },
    { value: "NOTE_COMMENT", label: "노트 댓글" },
    { value: "FILE", label: "파일함" },
];

const FILE_TYPE_SEARCH_OPTIONS = [
    ".jpg",
    ".txt",
    ".hwp",
    ".hwpx",
    ".gif",
    ".docx",
    ".pdf",
    ".webp",
].map(value => ({
    value,
    label: value,
}));

/*
 * ==========================================
 * 정렬
 * ==========================================
 */

const SORT_OPTIONS = [
    { value: "date-desc", label: "최신순" },
    { value: "date-asc", label: "오래된순" },
    { value: "name-asc", label: "파일명순" },
    { value: "name-desc", label: "파일명 역순" },
    { value: "size-desc", label: "큰 파일순" },
    { value: "size-asc", label: "작은 파일순" },
];

/*
 * ==========================================
 * 페이지 크기
 * ==========================================
 */

const PAGE_SIZE = 10;

/*
 * ==========================================
 * 컴포넌트
 * ==========================================
 */

export default function Files({
    source = "FILE",
    sourceNo = null,
}) {
    const { projectNo } = useParams();
    const navigate = useNavigate();
    const { project } = useOutletContext();

    /*
     * ==========================================
     * 파일 목록
     * ==========================================
     */

    const [files, setFiles] = useState([]);

    const [loginUser, setLoginUser] = useState("");
    const [loginRole, setLoginRole] = useState("");
    const [projectStatus, setProjectStatus] = useState("");

    /*
     * ==========================================
     * 검색
     * ==========================================
     */

    const [searchType, setSearchType] = useState("name");

    const [keyword, setKeyword] = useState("");

    const [sourceKeyword, setSourceKeyword] =
        useState("");

    const [fileTypeKeyword, setFileTypeKeyword] =
        useState("");

    /*
     * ==========================================
     * 정렬
     * ==========================================
     */

    const [sortType, setSortType] =
        useState("date-desc");

    /*
     * ==========================================
     * 페이징
     * ==========================================
     */

    const [page, setPage] = useState(1);

    const [size] = useState(PAGE_SIZE);

    const [totalCount, setTotalCount] =
        useState(0);

    const [totalPages, setTotalPages] =
        useState(0);

    /*
     * ==========================================
     * 상태
     * ==========================================
     */

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    /*
     * ==========================================
     * 파일 상세
     * ==========================================
     */

    const [detailFile, setDetailFile] =
        useState(null);

    const [detailImageError, setDetailImageError] =
        useState(false);

    /*
     * ==========================================
     * Record
     * ==========================================
     */

    const [recordModalOpen, setRecordModalOpen] =
        useState(false);

    const [recordTargetFile, setRecordTargetFile] =
        useState(null);

    const fileInputRef = useRef(null);

    /*
     * ==========================================
     * 프로젝트 상태
     * ==========================================
     */

    const isProjectClosed =
        String(
            project?.projectStatus ||
                projectStatus ||
                ""
        ).toLowerCase() === "closed";

    /*
     * ==========================================
     * 출처 표시
     * ==========================================
     */

    const getSourceLabel = fileSource =>
        fileSource
            ? SOURCE_LABEL[fileSource] ||
              fileSource
            : "-";

    /*
     * ==========================================
     * sourceNo 존재 여부
     * ==========================================
     */

    const hasSourceNo = file =>
        file &&
        file.attachSourceNo !== null &&
        file.attachSourceNo !== undefined &&
        file.attachSourceNo !== "";

    /*
     * ==========================================
     * 출처 클릭 가능 여부
     * ==========================================
     */

    const isSourceClickable = file =>
        !!(
            file?.attachSource &&
            hasSourceNo(file) &&
            [
                "NOTE",
                "NOTE_COMMENT",
                "TASK",
                "TASK_COMMENT",
            ].includes(file.attachSource)
        );

    /*
     * ==========================================
     * 출처 원본 이동
     *
     * 기존에 정상 작동하던 로직 유지
     * ==========================================
     */

    const handleSourceClick = async (
        e,
        file
    ) => {
        if (e) {
            e.stopPropagation();
        }

        if (!isSourceClickable(file)) {
            return;
        }

        const sourceType =
            file.attachSource;

        const sourceNo =
            file.attachSourceNo;

        try {
            /*
             * 노트
             */
            if (
                sourceType === "NOTE"
            ) {
                navigate(
                    `/projects/${projectNo}/note/${sourceNo}`
                );

                return;
            }

            /*
             * 업무
             */
            if (
                sourceType === "TASK"
            ) {
                navigate(
                    `/projects/${projectNo}/task?taskNo=${sourceNo}`
                );

                return;
            }

            /*
             * 노트 댓글
             *
             * 댓글 번호로 댓글 정보를 조회한 후
             * 원본 노트 번호를 가져감
             */
            if (
                sourceType ===
                "NOTE_COMMENT"
            ) {
                const response =
                    await apiClient.get(
                        `/note/comment/${sourceNo}`
                    );

                const comment =
                    response.data;

                if (
                    !comment ||
                    comment.noteNo ===
                        null ||
                    comment.noteNo ===
                        undefined
                ) {
                    toast.warning(
                        "댓글의 원본 노트를 찾을 수 없습니다."
                    );

                    return;
                }

                navigate(
                    `/projects/${projectNo}/note/${comment.noteNo}`
                );

                return;
            }

            /*
             * 업무 댓글
             *
             * 댓글 번호로 댓글 정보를 조회한 후
             * 원본 업무 번호를 가져감
             */
            if (
                sourceType ===
                "TASK_COMMENT"
            ) {
                const response =
                    await apiClient.get(
                        `/task/comment/${sourceNo}`
                    );

                const comment =
                    response.data;

                if (
                    !comment ||
                    comment.taskNo ===
                        null ||
                    comment.taskNo ===
                        undefined
                ) {
                    toast.warning(
                        "댓글의 원본 업무를 찾을 수 없습니다."
                    );

                    return;
                }

                navigate(
                    `/projects/${projectNo}/task?taskNo=${comment.taskNo}`
                );
            }
        } catch (error) {
            console.error(
                "출처 원본 이동 실패:",
                error
            );

            console.error(
                "서버 응답:",
                error.response?.data
            );

            toast.error(
                error.response?.data
                    ?.message ||
                    "원본으로 이동하는 중 오류가 발생했습니다."
            );
        }
    };

    /*
     * ==========================================
     * 현재 검색어
     * ==========================================
     */

    const getCurrentKeyword = (
        currentSearchType = searchType
    ) => {
        if (
            currentSearchType ===
            "source"
        ) {
            return sourceKeyword;
        }

        if (
            currentSearchType ===
            "type"
        ) {
            return fileTypeKeyword;
        }

        return keyword;
    };

    /*
     * ==========================================
     * 파일 목록 조회
     *
     * 백엔드 페이징 + 정렬 사용
     * ==========================================
     */

    const fetchFiles = async ({
        targetPage = page,
        targetKeyword = getCurrentKeyword(),
        targetSearchType = searchType,
        targetSortType = sortType,
    } = {}) => {
        if (!projectNo) {
            console.error(
                "프로젝트 번호가 없습니다."
            );

            setFiles([]);
            setProjectStatus("");
            setTotalCount(0);
            setTotalPages(0);

            return;
        }

        const validSearchTypes = [
            "name",
            "source",
            "uploader",
            "type",
        ];

        const normalizedSearchType =
            validSearchTypes.includes(
                targetSearchType
            )
                ? targetSearchType
                : "name";

        const trimmedKeyword =
            String(
                targetKeyword ?? ""
            ).trim();

        const safePage =
            Math.max(
                1,
                Number(targetPage) || 1
            );

        const safeSortType =
            SORT_OPTIONS.some(
                option =>
                    option.value ===
                    targetSortType
            )
                ? targetSortType
                : "date-desc";

        try {
            setLoading(true);

            /*
             * 백엔드로 전달할 파라미터
             */
            const params = {
                page: safePage,
                size,
                searchType:
                    normalizedSearchType,
                sortType:
                    safeSortType,
            };

            /*
             * 검색어가 있을 때만 전달
             */
            if (trimmedKeyword) {
                params.keyword =
                    trimmedKeyword;
            }

            console.log(
                "[Files] 조회 요청:",
                params
            );

            const response =
                await apiClient.get(
                    `/attach/list/${projectNo}`,
                    {
                        params,
                    }
                );

            const data =
                response.data || {};

            console.log(
                "[Files] 조회 응답:",
                data
            );

            /*
             * 파일 목록
             *
             * 백엔드에서 이미
             * 정렬 + 페이징된 상태
             */
            setFiles(
                Array.isArray(
                    data.files
                )
                    ? data.files
                    : []
            );

            /*
             * 로그인 사용자
             */
            setLoginUser(
                data.loginUser || ""
            );

            /*
             * 로그인 권한
             */
            setLoginRole(
                data.loginRole || ""
            );

            /*
             * 프로젝트 상태
             */
            setProjectStatus(
                data.projectStatus ||
                    ""
            );

            /*
             * 현재 페이지
             */
            setPage(
                Number(data.page) ||
                    safePage
            );

            /*
             * 전체 파일 수
             */
            setTotalCount(
                Number(
                    data.totalCount
                ) || 0
            );

            /*
             * 전체 페이지 수
             */
            setTotalPages(
                Number(
                    data.totalPages
                ) || 0
            );
        } catch (error) {
            console.error(
                "파일 목록 조회 실패:",
                error
            );

            console.error(
                "서버 응답:",
                error.response?.data
            );

            setFiles([]);

            setLoginUser("");
            setLoginRole("");
            setProjectStatus("");

            setTotalCount(0);
            setTotalPages(0);

            toast.error(
                error.response?.data
                    ?.message ||
                    "파일 목록을 불러오는 중 오류가 발생했습니다."
            );
        } finally {
            setLoading(false);
        }
    };

    /*
     * ==========================================
     * 프로젝트 변경
     * ==========================================
     */

    useEffect(() => {
        setKeyword("");
        setSourceKeyword("");
        setFileTypeKeyword("");

        setSearchType("name");
        setSortType("date-desc");

        setPage(1);
        setTotalCount(0);
        setTotalPages(0);

        setProjectStatus("");

        fetchFiles({
            targetPage: 1,
            targetKeyword: "",
            targetSearchType: "name",
            targetSortType:
                "date-desc",
        });
    }, [projectNo]);

    /*
     * ==========================================
     * 검색 조건 변경
     * ==========================================
     */

    const handleSearchTypeChange = e => {
        const value =
            e.target.value;

        setSearchType(value);

        setKeyword("");
        setSourceKeyword("");
        setFileTypeKeyword("");

        setPage(1);
    };

    /*
     * ==========================================
     * 출처 검색
     * ==========================================
     */

    const handleSourceChange = e => {
        const value =
            e.target.value;

        setSourceKeyword(value);

        setPage(1);

        fetchFiles({
            targetPage: 1,
            targetKeyword: value,
            targetSearchType:
                "source",
            targetSortType:
                sortType,
        });
    };

    /*
     * ==========================================
     * 파일 형태 검색
     * ==========================================
     */

    const handleFileTypeChange =
        e => {
            const value =
                e.target.value;

            setFileTypeKeyword(value);

            setPage(1);

            fetchFiles({
                targetPage: 1,
                targetKeyword: value,
                targetSearchType:
                    "type",
                targetSortType:
                    sortType,
            });
        };

    /*
     * ==========================================
     * 검색
     * ==========================================
     */

    const handleSearch = () => {
        const currentKeyword =
            getCurrentKeyword();

        setPage(1);

        fetchFiles({
            targetPage: 1,
            targetKeyword:
                currentKeyword,
            targetSearchType:
                searchType,
            targetSortType:
                sortType,
        });
    };

    /*
     * ==========================================
     * 검색 초기화
     * ==========================================
     */

    const handleSearchReset = () => {
        setKeyword("");
        setSourceKeyword("");
        setFileTypeKeyword("");

        setPage(1);

        fetchFiles({
            targetPage: 1,
            targetKeyword: "",
            targetSearchType:
                searchType,
            targetSortType:
                sortType,
        });
    };

    /*
     * ==========================================
     * 검색 Enter
     * ==========================================
     */

    const handleSearchKeyDown =
        e => {
            if (
                searchType ===
                    "source" ||
                searchType ===
                    "type"
            ) {
                return;
            }

            if (
                e.key === "Enter"
            ) {
                handleSearch();
            }
        };

    /*
     * ==========================================
     * 정렬 변경
     * ==========================================
     */

    const handleSortChange = e => {
        const value =
            e.target.value;

        setSortType(value);
        setPage(1);

        /*
         * 백엔드에 정렬 조건 전달
         *
         * 프론트에서 sortedFiles로
         * 다시 정렬하지 않음
         */
        fetchFiles({
            targetPage: 1,
            targetKeyword:
                getCurrentKeyword(),
            targetSearchType:
                searchType,
            targetSortType: value,
        });
    };

    /*
     * ==========================================
     * 페이지 이동
     * ==========================================
     */

    const handlePageChange =
        targetPage => {
            if (loading) {
                return;
            }

            if (
                targetPage < 1 ||
                targetPage >
                    totalPages
            ) {
                return;
            }

            setPage(targetPage);

            fetchFiles({
                targetPage,
                targetKeyword:
                    getCurrentKeyword(),
                targetSearchType:
                    searchType,
                targetSortType:
                    sortType,
            });

            /*
             * 목록 상단으로 이동
             */
            document
                .querySelector(
                    ".files-list"
                )
                ?.scrollIntoView({
                    behavior:
                        "smooth",
                    block: "start",
                });
        };

    /*
     * ==========================================
     * 페이지 번호 계산
     * ==========================================
     */

    const getPageNumbers = () => {
        if (
            totalPages <= 0
        ) {
            return [];
        }

        /*
         * 7페이지 이하
         */
        if (
            totalPages <= 7
        ) {
            return Array.from(
                {
                    length:
                        totalPages,
                },
                (_, index) =>
                    index + 1
            );
        }

        let startPage =
            Math.max(
                1,
                page - 2
            );

        let endPage =
            Math.min(
                totalPages,
                page + 2
            );

        /*
         * 현재 페이지가 앞쪽
         */
        if (
            startPage === 1
        ) {
            endPage =
                Math.min(
                    totalPages,
                    5
                );
        }

        /*
         * 현재 페이지가 뒤쪽
         */
        if (
            endPage ===
            totalPages
        ) {
            startPage =
                Math.max(
                    1,
                    totalPages - 4
                );
        }

        const pages = [];

        for (
            let i = startPage;
            i <= endPage;
            i++
        ) {
            pages.push(i);
        }

        return pages;
    };

    /*
     * ==========================================
     * 업로드 버튼
     * ==========================================
     */

    const handleUploadClick =
        () => {
            if (uploading) {
                return;
            }

            if (!projectNo) {
                toast.warning(
                    "프로젝트 정보가 없습니다."
                );

                return;
            }

            if (
                isProjectClosed
            ) {
                toast.warning(
                    "종료된 프로젝트에는 파일을 업로드할 수 없습니다."
                );

                return;
            }

            fileInputRef.current?.click();
        };

    /*
     * ==========================================
     * 파일 업로드
     * ==========================================
     */

    const handleFileChange =
        async e => {
            const file =
                e.target.files?.[0];

            if (!file) {
                return;
            }

            if (!projectNo) {
                toast.warning(
                    "프로젝트 정보가 없습니다."
                );

                e.target.value = "";

                return;
            }

            if (
                isProjectClosed
            ) {
                toast.warning(
                    "종료된 프로젝트에는 파일을 업로드할 수 없습니다."
                );

                e.target.value = "";

                return;
            }

            const formData =
                new FormData();

            formData.append(
                "projectNo",
                projectNo
            );

            formData.append(
                "attach",
                file
            );

            formData.append(
                "source",
                source || "FILE"
            );

            if (
                sourceNo !== null &&
                sourceNo !==
                    undefined &&
                sourceNo !== ""
            ) {
                formData.append(
                    "sourceNo",
                    sourceNo
                );
            }

            try {
                setUploading(true);

                await apiClient.post(
                    "/attach/upload",
                    formData
                );

                /*
                 * 업로드 후
                 * 현재 검색 / 정렬 / 페이지 유지
                 */
                await fetchFiles({
                    targetPage:
                        page,
                    targetKeyword:
                        getCurrentKeyword(),
                    targetSearchType:
                        searchType,
                    targetSortType:
                        sortType,
                });

                toast.success(
                    "파일이 업로드되었습니다."
                );
            } catch (error) {
                console.error(
                    "파일 업로드 실패:",
                    error
                );

                console.error(
                    "서버 응답:",
                    error.response?.data
                );

                toast.error(
                    error.response?.data
                        ?.message ||
                        "파일 업로드 중 오류가 발생했습니다."
                );
            } finally {
                setUploading(
                    false
                );

                e.target.value =
                    "";
            }
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
            fileName.lastIndexOf(
                "."
            );

        return index === -1
            ? ""
            : fileName
                  .substring(
                      index + 1
                  )
                  .toLowerCase();
    };

    /*
     * ==========================================
     * 파일 타입
     * ==========================================
     */

    const getFileType = (
        fileName = ""
    ) => {
        const extension =
            getExtension(
                fileName
            );

        if (
            [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "webp",
                "svg",
                "bmp",
            ].includes(
                extension
            )
        ) {
            return "image";
        }

        if (
            extension === "pdf"
        ) {
            return "pdf";
        }

        if (
            ["doc", "docx"].includes(
                extension
            )
        ) {
            return "word";
        }

        if (
            ["xls", "xlsx"].includes(
                extension
            )
        ) {
            return "excel";
        }

        if (
            ["ppt", "pptx"].includes(
                extension
            )
        ) {
            return "powerpoint";
        }

        if (
            [
                "zip",
                "rar",
                "7z",
            ].includes(
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

    const getFileUrl =
        attachNo =>
            attachNo
                ? `http://localhost:8080/api/attach/${attachNo}`
                : "";

    /*
     * ==========================================
     * 파일 상세
     * ==========================================
     */

    const openFileDetail =
        file => {
            setDetailImageError(
                false
            );

            setDetailFile(file);
        };

    const closeFileDetail =
        () => {
            setDetailFile(null);
            setDetailImageError(
                false
            );
        };

    /*
     * ==========================================
     * ESC
     * ==========================================
     */

    useEffect(() => {
        const handleKeyDown =
            e => {
                if (
                    e.key ===
                        "Escape" &&
                    detailFile
                ) {
                    closeFileDetail();
                }
            };

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [detailFile]);

    /*
     * ==========================================
     * 다운로드
     * ==========================================
     */

    const handleDownload =
        attachNo => {
            if (!attachNo) {
                return;
            }

            window.location.href =
                getFileUrl(
                    attachNo
                );
        };

    /*
     * ==========================================
     * 삭제 가능 여부
     * ==========================================
     */

    const canDeleteFile =
        file => {
            if (
                isProjectClosed
            ) {
                return false;
            }

            const role =
                String(
                    loginRole || ""
                ).toLowerCase();

            const currentUser =
                String(
                    loginUser ?? ""
                );

            const uploader =
                String(
                    file?.attachUploader ??
                        ""
                );

            /*
             * 프로젝트 관리자
             */
            if (
                role === "owner" ||
                role === "manager"
            ) {
                return true;
            }

            /*
             * 일반 멤버
             */
            if (
                role === "member"
            ) {
                return (
                    currentUser !==
                        "" &&
                    currentUser ===
                        uploader
                );
            }

            return false;
        };

    /*
     * ==========================================
     * 삭제
     * ==========================================
     */

    const handleDelete =
        async (
            attachNo,
            fileName
        ) => {
            if (
                isProjectClosed
            ) {
                toast.warning(
                    "종료된 프로젝트의 파일은 삭제할 수 없습니다."
                );

                return;
            }

            const result =
                await Swal.fire({
                    title: "파일을 삭제하시겠습니까?",
                    html: `<strong>"${fileName}"</strong> 파일이 삭제됩니다.<br><span style="font-size:13px;color:#64748b;">삭제한 파일은 복구할 수 없습니다.</span>`,
                    icon: "warning",
                    showCancelButton:
                        true,
                    confirmButtonColor:
                        "#e11d48",
                    cancelButtonColor:
                        "#94a3b8",
                    confirmButtonText:
                        "삭제",
                    cancelButtonText:
                        "취소",
                    reverseButtons:
                        true,
                });

            if (
                !result.isConfirmed
            ) {
                return;
            }

            try {
                await apiClient.delete(
                    `/attach/${attachNo}`
                );

                if (
                    detailFile?.attachNo ===
                    attachNo
                ) {
                    closeFileDetail();
                }

                /*
                 * 삭제 후
                 * 현재 페이지 다시 조회
                 *
                 * 서버가 totalCount / totalPages를
                 * 다시 계산하도록 함
                 */
                const newTotalCount =
                    Math.max(
                        0,
                        totalCount - 1
                    );

                const newTotalPages =
                    Math.ceil(
                        newTotalCount /
                            size
                    );

                /*
                 * 현재 페이지의 마지막 파일을
                 * 삭제한 경우 이전 페이지로 이동
                 */
                if (
                    files.length ===
                        1 &&
                    page >
                        newTotalPages &&
                    newTotalPages >
                        0
                ) {
                    await fetchFiles({
                        targetPage:
                            newTotalPages,
                        targetKeyword:
                            getCurrentKeyword(),
                        targetSearchType:
                            searchType,
                        targetSortType:
                            sortType,
                    });
                } else {
                    await fetchFiles({
                        targetPage:
                            page,
                        targetKeyword:
                            getCurrentKeyword(),
                        targetSearchType:
                            searchType,
                        targetSortType:
                            sortType,
                    });
                }

                toast.success(
                    "파일이 삭제되었습니다."
                );
            } catch (error) {
                console.error(
                    "파일 삭제 실패:",
                    error
                );

                console.error(
                    "서버 응답:",
                    error.response?.data
                );

                const message =
                    error.response
                        ?.data
                        ?.message ||
                    error.response
                        ?.data ||
                    "파일 삭제 중 오류가 발생했습니다.";

                Swal.fire({
                    title: "기록에서 참조 중인 파일은 삭제할 수 없습니다.",
                    text: message,
                    icon: "warning",
                    confirmButtonColor:
                        "#64748b",
                    confirmButtonText:
                        "확인",
                });
            }
        };

    /*
     * ==========================================
     * Record
     * ==========================================
     */

    const handleRecord =
        file => {
            if (
                isProjectClosed
            ) {
                toast.warning(
                    "종료된 프로젝트에서는 Record를 남길 수 없습니다."
                );

                return;
            }

            setRecordTargetFile(
                file
            );

            setRecordModalOpen(
                true
            );
        };

    const closeRecordModal =
        () => {
            setRecordModalOpen(
                false
            );

            setRecordTargetFile(
                null
            );
        };

    /*
     * ==========================================
     * 파일 크기
     * ==========================================
     */

    const formatFileSize =
        size => {
            if (
                size === null ||
                size === undefined
            ) {
                return "-";
            }

            if (
                size < 1024
            ) {
                return `${size} B`;
            }

            if (
                size <
                1024 *
                    1024
            ) {
                return `${(
                    size / 1024
                ).toFixed(1)} KB`;
            }

            if (
                size <
                1024 *
                    1024 *
                    1024
            ) {
                return `${(
                    size /
                    (1024 *
                        1024)
                ).toFixed(1)} MB`;
            }

            return `${(
                size /
                (1024 *
                    1024 *
                    1024)
            ).toFixed(1)} GB`;
        };

    /*
     * ==========================================
     * 날짜
     * ==========================================
     */

    const formatDate =
        date => {
            if (!date) {
                return "-";
            }

            const d =
                new Date(date);

            if (
                Number.isNaN(
                    d.getTime()
                )
            ) {
                return "-";
            }

            const year =
                d.getFullYear();

            const month =
                String(
                    d.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );

            const day =
                String(
                    d.getDate()
                ).padStart(
                    2,
                    "0"
                );

            return `${year}.${month}.${day}`;
        };

    /*
     * ==========================================
     * 파일 아이콘
     * ==========================================
     */

    const FileIcon =
        ({ file }) => {
            const type =
                getFileType(
                    file.attachName
                );

            /*
             * 이미지
             */
            if (
                type === "image"
            ) {
                return (
                    <div className="files-image-thumbnail">
                        <img
                            src={getFileUrl(
                                file.attachNo
                            )}
                            alt={
                                file.attachName
                            }
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

                        <div className="files-image-fallback">
                            <span>
                                이미지 없음
                            </span>
                        </div>
                    </div>
                );
            }

            const iconMap = {
                pdf: [
                    "files-icon-pdf",
                    "PDF",
                ],
                word: [
                    "files-icon-word",
                    "W",
                ],
                excel: [
                    "files-icon-excel",
                    "X",
                ],
                powerpoint: [
                    "files-icon-powerpoint",
                    "P",
                ],
                zip: [
                    "files-icon-zip",
                    "ZIP",
                ],
            };

            if (
                iconMap[type]
            ) {
                const [
                    className,
                    text,
                ] =
                    iconMap[type];

                return (
                    <div
                        className={`files-icon ${className}`}
                    >
                        <span>
                            {text}
                        </span>
                    </div>
                );
            }

            return (
                <div className="files-icon files-icon-default">
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
     * ==========================================
     * 검색 아이콘
     * ==========================================
     */

    const SearchIcon =
        () => (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <circle
                    cx="11"
                    cy="11"
                    r="7"
                />

                <path d="m16 16 5 5" />
            </svg>
        );

    /*
     * ==========================================
     * 업로드 아이콘
     * ==========================================
     */

    const UploadIcon =
        () => (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M5 20h14" />
            </svg>
        );

    /*
     * ==========================================
     * 다운로드 아이콘
     * ==========================================
     */

    const DownloadIcon =
        () => (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
            </svg>
        );

    /*
     * ==========================================
     * 삭제 아이콘
     * ==========================================
     */

    const DeleteIcon =
        () => (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
                <path d="M9 6V4h6v2" />
            </svg>
        );

    /*
     * ==========================================
     * 닫기 아이콘
     * ==========================================
     */

    const CloseIcon =
        () => (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            >
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
            </svg>
        );

    /*
     * ==========================================
     * Record 아이콘
     * ==========================================
     */

    const RecordIcon =
        () => (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M6 3h12v18H6z" />
                <path d="M9 8h6" />
                <path d="M9 12h6" />
                <path d="M9 16h4" />
            </svg>
        );

    /*
     * ==========================================
     * 이전 페이지 아이콘
     * ==========================================
     */

    const ChevronLeftIcon =
        () => (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="m15 18-6-6 6-6" />
            </svg>
        );

    /*
     * ==========================================
     * 다음 페이지 아이콘
     * ==========================================
     */

    const ChevronRightIcon =
        () => (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="m9 18 6-6-6-6" />
            </svg>
        );

    /*
     * ==========================================
     * 검색 입력
     * ==========================================
     */

    const renderSearchInput =
        () => {
            /*
             * 출처
             */
            if (
                searchType ===
                "source"
            ) {
                return (
                    <select
                        className="files-source-search-select"
                        aria-label="출처 선택"
                        value={
                            sourceKeyword
                        }
                        onChange={
                            handleSourceChange
                        }
                    >
                        <option value="">
                            출처 선택
                        </option>

                        {SOURCE_SEARCH_OPTIONS.map(
                            option => (
                                <option
                                    key={
                                        option.value
                                    }
                                    value={
                                        option.value
                                    }
                                >
                                    {
                                        option.label
                                    }
                                </option>
                            )
                        )}
                    </select>
                );
            }

            /*
             * 파일 형태
             */
            if (
                searchType ===
                "type"
            ) {
                return (
                    <select
                        className="files-type-search-select"
                        aria-label="파일 형태 선택"
                        value={
                            fileTypeKeyword
                        }
                        onChange={
                            handleFileTypeChange
                        }
                    >
                        <option value="">
                            파일 형태 선택
                        </option>

                        {FILE_TYPE_SEARCH_OPTIONS.map(
                            option => (
                                <option
                                    key={
                                        option.value
                                    }
                                    value={
                                        option.value
                                    }
                                >
                                    {
                                        option.label
                                    }
                                </option>
                            )
                        )}
                    </select>
                );
            }

            /*
             * 파일명 / 업로더
             */
            return (
                <input
                    type="text"
                    aria-label={`${SEARCH_TYPE_LABEL[searchType]} 검색어`}
                    placeholder={`${SEARCH_TYPE_LABEL[searchType]} 검색`}
                    value={
                        keyword
                    }
                    onChange={e =>
                        setKeyword(
                            e.target.value
                        )
                    }
                    onKeyDown={
                        handleSearchKeyDown
                    }
                />
            );
        };

    /*
     * ==========================================
     * 파일 상세 모달
     * ==========================================
     */

    const renderFileDetailModal =
        () => {
            if (!detailFile) {
                return null;
            }

            const detailType =
                getFileType(
                    detailFile.attachName
                );

            const sourceClickable =
                isSourceClickable(
                    detailFile
                );

            return (
                <div
                    className="files-detail-overlay"
                    onMouseDown={e => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closeFileDetail();
                        }
                    }}
                >
                    <div className="files-detail-modal">
                        <div className="files-detail-header">
                            <div className="files-detail-header-title">
                                <span>
                                    파일 정보
                                </span>
                            </div>

                            <button
                                type="button"
                                className="files-detail-close"
                                onClick={
                                    closeFileDetail
                                }
                                title="닫기"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="files-detail-body">
                            <div className="files-detail-preview">
                                {detailType ===
                                "image" ? (
                                    !detailImageError ? (
                                        <img
                                            src={getFileUrl(
                                                detailFile.attachNo
                                            )}
                                            alt={
                                                detailFile.attachName
                                            }
                                            className="files-detail-image"
                                            onError={() =>
                                                setDetailImageError(
                                                    true
                                                )
                                            }
                                        />
                                    ) : (
                                        <div className="files-detail-image-error">
                                            <FileIcon
                                                file={
                                                    detailFile
                                                }
                                            />

                                            <span>
                                                이미지를 불러올 수 없습니다.
                                            </span>
                                        </div>
                                    )
                                ) : (
                                    <div className="files-detail-file-icon">
                                        <FileIcon
                                            file={
                                                detailFile
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="files-detail-info">
                                <div className="files-detail-name">
                                    <span className="files-detail-label">
                                        파일명
                                    </span>

                                    <strong
                                        title={
                                            detailFile.attachName
                                        }
                                    >
                                        {detailFile.attachName ||
                                            "-"}
                                    </strong>
                                </div>

                                <div className="files-detail-info-row">
                                    <span>
                                        출처
                                    </span>

                                    {sourceClickable ? (
                                        <button
                                            type="button"
                                            className="files-detail-source-link"
                                            onClick={e =>
                                                handleSourceClick(
                                                    e,
                                                    detailFile
                                                )
                                            }
                                        >
                                            {getSourceLabel(
                                                detailFile.attachSource
                                            )}
                                        </button>
                                    ) : (
                                        <span>
                                            {getSourceLabel(
                                                detailFile.attachSource
                                            )}
                                        </span>
                                    )}
                                </div>

                                <div className="files-detail-info-row">
                                    <span>
                                        업로더
                                    </span>

                                    <span>
                                        {detailFile.empName ||
                                            detailFile.attachUploader ||
                                            "-"}
                                    </span>
                                </div>

                                <div className="files-detail-info-row">
                                    <span>
                                        파일 형태
                                    </span>

                                    <span>
                                        {getExtension(
                                            detailFile.attachName
                                        )
                                            ? `.${getExtension(
                                                  detailFile.attachName
                                              )}`
                                            : "-"}
                                    </span>
                                </div>

                                <div className="files-detail-info-row">
                                    <span>
                                        크기
                                    </span>

                                    <span>
                                        {formatFileSize(
                                            detailFile.attachSize
                                        )}
                                    </span>
                                </div>

                                <div className="files-detail-info-row">
                                    <span>
                                        올린 날짜
                                    </span>

                                    <span>
                                        {formatDate(
                                            detailFile.attachCtime
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="files-detail-footer">
                            <button
                                type="button"
                                className="files-detail-download-button"
                                onClick={() =>
                                    handleDownload(
                                        detailFile.attachNo
                                    )
                                }
                            >
                                <DownloadIcon />

                                <span>
                                    다운로드
                                </span>
                            </button>

                            {!isProjectClosed && (
                                <button
                                    type="button"
                                    className="files-detail-record-button"
                                    onClick={() => {
                                        closeFileDetail();

                                        handleRecord(
                                            detailFile
                                        );
                                    }}
                                >
                                    <RecordIcon />

                                    <span>
                                        Record
                                    </span>
                                </button>
                            )}

                            {!isProjectClosed &&
                                canDeleteFile(
                                    detailFile
                                ) && (
                                    <button
                                        type="button"
                                        className="files-detail-delete-button"
                                        onClick={() =>
                                            handleDelete(
                                                detailFile.attachNo,
                                                detailFile.attachName
                                            )
                                        }
                                    >
                                        <DeleteIcon />

                                        <span>
                                            삭제
                                        </span>
                                    </button>
                                )}
                        </div>
                    </div>
                </div>
            );
        };

    /*
     * ==========================================
     * 페이지네이션
     * ==========================================
     */

    const renderPagination =
        () => {
            if (
                loading ||
                totalPages <= 1
            ) {
                return null;
            }

            const pageNumbers =
                getPageNumbers();

            return (
                <div className="files-pagination">
                    <button
                        type="button"
                        className="files-page-button files-page-arrow"
                        disabled={
                            page <= 1
                        }
                        onClick={() =>
                            handlePageChange(
                                page - 1
                            )
                        }
                        aria-label="이전 페이지"
                        title="이전 페이지"
                    >
                        <ChevronLeftIcon />
                    </button>

                    {page > 3 &&
                        totalPages >
                            7 && (
                            <>
                                <button
                                    type="button"
                                    className="files-page-button"
                                    onClick={() =>
                                        handlePageChange(
                                            1
                                        )
                                    }
                                >
                                    1
                                </button>

                                <span className="files-page-dots">
                                    ...
                                </span>
                            </>
                        )}

                    {pageNumbers.map(
                        pageNumber => (
                            <button
                                key={
                                    pageNumber
                                }
                                type="button"
                                className={`files-page-button ${
                                    pageNumber ===
                                    page
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    handlePageChange(
                                        pageNumber
                                    )
                                }
                            >
                                {
                                    pageNumber
                                }
                            </button>
                        )
                    )}

                    {page <
                        totalPages -
                            2 &&
                        totalPages >
                            7 && (
                            <>
                                <span className="files-page-dots">
                                    ...
                                </span>

                                <button
                                    type="button"
                                    className="files-page-button"
                                    onClick={() =>
                                        handlePageChange(
                                            totalPages
                                        )
                                    }
                                >
                                    {
                                        totalPages
                                    }
                                </button>
                            </>
                        )}

                    <button
                        type="button"
                        className="files-page-button files-page-arrow"
                        disabled={
                            page >=
                            totalPages
                        }
                        onClick={() =>
                            handlePageChange(
                                page + 1
                            )
                        }
                        aria-label="다음 페이지"
                        title="다음 페이지"
                    >
                        <ChevronRightIcon />
                    </button>
                </div>
            );
        };

    /*
     * ==========================================
     * 화면
     * ==========================================
     */

    return (
        <div className="files-page">
            <div className="files-container">

                {/* ==========================
                    Toolbar
                ========================== */}

                <div className="files-toolbar">
                    <div className="files-search-area">
                        <select
                            className="files-search-type"
                            value={
                                searchType
                            }
                            onChange={
                                handleSearchTypeChange
                            }
                        >
                            {SEARCH_TYPE_OPTIONS.map(
                                option => (
                                    <option
                                        key={
                                            option.value
                                        }
                                        value={
                                            option.value
                                        }
                                    >
                                        {
                                            option.label
                                        }
                                    </option>
                                )
                            )}
                        </select>

                        <div
                            className={`files-search ${
                                searchType ===
                                "source"
                                    ? "files-search-source"
                                    : ""
                            } ${
                                searchType ===
                                "type"
                                    ? "files-search-type-mode"
                                    : ""
                            }`}
                        >
                            {renderSearchInput()}

                            {searchType !==
                                "source" &&
                                searchType !==
                                    "type" && (
                                    <button
                                        type="button"
                                        onClick={
                                            handleSearch
                                        }
                                        aria-label="검색"
                                    >
                                        <SearchIcon />
                                    </button>
                                )}
                        </div>

                        {(keyword ||
                            sourceKeyword ||
                            fileTypeKeyword) && (
                            <button
                                type="button"
                                className="files-search-reset"
                                onClick={
                                    handleSearchReset
                                }
                            >
                                초기화
                            </button>
                        )}
                    </div>

                    <div className="files-sort-area">
                        <select
                            className="files-sort-select"
                            value={
                                sortType
                            }
                            onChange={
                                handleSortChange
                            }
                            aria-label="파일 정렬"
                        >
                            {SORT_OPTIONS.map(
                                option => (
                                    <option
                                        key={
                                            option.value
                                        }
                                        value={
                                            option.value
                                        }
                                    >
                                        {
                                            option.label
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {!isProjectClosed && (
                        <button
                            type="button"
                            className="files-upload-button"
                            onClick={
                                handleUploadClick
                            }
                            disabled={
                                uploading
                            }
                        >
                            <UploadIcon />

                            <span>
                                {uploading
                                    ? "업로드 중..."
                                    : "파일 업로드"}
                            </span>
                        </button>
                    )}

                    <input
                        ref={
                            fileInputRef
                        }
                        type="file"
                        className="files-hidden-input"
                        onChange={
                            handleFileChange
                        }
                    />
                </div>

                {/* ==========================
                    파일 목록
                ========================== */}

                <div className="files-list">

                    <div className="files-list-header">
                        <div className="files-col-file">
                            파일명
                        </div>

                        <div className="files-col-source">
                            출처
                        </div>

                        <div className="files-col-uploader">
                            업로더
                        </div>

                        <div className="files-col-date">
                            올린 날짜
                        </div>

                        <div className="files-col-download">
                            다운로드
                        </div>

                        <div className="files-col-size">
                            크기
                        </div>

                        <div className="files-col-record">
                            Record
                        </div>

                        <div className="files-col-delete">
                            삭제
                        </div>
                    </div>

                    {/* 로딩 */}

                    {loading && (
                        <div className="files-empty">
                            <div className="files-loading-spinner" />

                            <p>
                                파일을
                                불러오는
                                중입니다.
                            </p>
                        </div>
                    )}

                    {/* 파일 없음 */}

                    {!loading &&
                        files.length ===
                            0 && (
                            <div className="files-empty">
                                <div className="files-empty-icon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path d="M4 7h5l2 2h9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />
                                        <path d="M4 7V5a2 2 0 0 1 2-2h4l2 2" />
                                    </svg>
                                </div>

                                <p>
                                    {keyword ||
                                    sourceKeyword ||
                                    fileTypeKeyword
                                        ? "검색 결과가 없습니다."
                                        : "등록된 파일이 없습니다."}
                                </p>
                            </div>
                        )}

                    {/* 파일 */}

                    {!loading &&
                        files.map(
                            file => {
                                const type =
                                    getFileType(
                                        file.attachName
                                    );

                                const sourceClickable =
                                    isSourceClickable(
                                        file
                                    );

                                return (
                                    <div
                                        className={`files-list-row ${
                                            type ===
                                            "image"
                                                ? "files-image-row"
                                                : ""
                                        }`}
                                        key={
                                            file.attachNo
                                        }
                                        onClick={() =>
                                            openFileDetail(
                                                file
                                            )
                                        }
                                    >
                                        {/* 파일명 */}

                                        <div className="files-col-file files-file-name">
                                            <FileIcon
                                                file={
                                                    file
                                                }
                                            />

                                            <span
                                                className="files-name-text"
                                                title={
                                                    file.attachName
                                                }
                                            >
                                                {
                                                    file.attachName
                                                }
                                            </span>
                                        </div>

                                        {/* 출처 */}

                                        <div
                                            className={`files-col-source ${
                                                sourceClickable
                                                    ? "files-source-clickable"
                                                    : ""
                                            }`}
                                            onClick={e =>
                                                handleSourceClick(
                                                    e,
                                                    file
                                                )
                                            }
                                            title={
                                                sourceClickable
                                                    ? "원본으로 이동"
                                                    : ""
                                            }
                                        >
                                            {getSourceLabel(
                                                file.attachSource
                                            )}
                                        </div>

                                        {/* 업로더 */}

                                        <div className="files-col-uploader">
                                            {file.empName ||
                                                file.attachUploader ||
                                                "-"}
                                        </div>

                                        {/* 날짜 */}

                                        <div className="files-col-date">
                                            {formatDate(
                                                file.attachCtime
                                            )}
                                        </div>

                                        {/* 다운로드 */}

                                        <div className="files-col-download">
                                            <button
                                                type="button"
                                                className="files-download-button"
                                                onClick={e => {
                                                    e.stopPropagation();

                                                    handleDownload(
                                                        file.attachNo
                                                    );
                                                }}
                                                title="다운로드"
                                            >
                                                <DownloadIcon />
                                            </button>
                                        </div>

                                        {/* 크기 */}

                                        <div className="files-col-size">
                                            {formatFileSize(
                                                file.attachSize
                                            )}
                                        </div>

                                        {/* Record */}

                                        <div className="files-col-record">
                                            {!isProjectClosed && (
                                                <button
                                                    type="button"
                                                    className="files-record-button"
                                                    onClick={e => {
                                                        e.stopPropagation();

                                                        handleRecord(
                                                            file
                                                        );
                                                    }}
                                                    title="Record로 남기기"
                                                >
                                                    <RecordIcon />
                                                </button>
                                            )}
                                        </div>

                                        {/* 삭제 */}

                                        <div className="files-col-delete">
                                            {!isProjectClosed &&
                                                canDeleteFile(
                                                    file
                                                ) && (
                                                    <button
                                                        type="button"
                                                        className="files-delete-button"
                                                        onClick={e => {
                                                            e.stopPropagation();

                                                            handleDelete(
                                                                file.attachNo,
                                                                file.attachName
                                                            );
                                                        }}
                                                        title="삭제"
                                                    >
                                                        <DeleteIcon />
                                                    </button>
                                                )}
                                        </div>
                                    </div>
                                );
                            }
                        )}
                </div>

                {/* ==========================
                    파일 개수
                ========================== */}

                {!loading &&
                    totalCount > 0 && (
                        <div className="files-count">
                            총{" "}
                            <strong>
                                {totalCount.toLocaleString()}
                            </strong>
                            개의 파일
                        </div>
                    )}

                {/* ==========================
                    페이지네이션
                ========================== */}

                {renderPagination()}
            </div>

            {/* ==========================
                파일 상세
            ========================== */}

            {renderFileDetailModal()}

            {/* ==========================
                Record
            ========================== */}

            {recordTargetFile && (
                <RecordLinkModal
                    show={
                        recordModalOpen
                    }
                    onHide={
                        closeRecordModal
                    }
                    projectNo={
                        projectNo
                    }
                    relatedType="ATTACH"
                    relatedNo={
                        recordTargetFile.attachNo
                    }
                    relatedTitle={
                        recordTargetFile.attachName
                    }
                />
            )}
        </div>
    );
}

