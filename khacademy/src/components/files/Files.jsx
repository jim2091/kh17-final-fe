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
 * 검색 종류
 * ==========================================
 */

const SEARCH_TYPE_LABEL = {
    name: "파일명",
    source: "출처",
    uploader: "업로더",
    type: "파일 형태",
};


const SEARCH_TYPE_OPTIONS = [
    {
        value: "name",
        label: "파일명",
    },
    {
        value: "source",
        label: "출처",
    },
    {
        value: "uploader",
        label: "업로더",
    },
    {
        value: "type",
        label: "파일 형태",
    },
];


/*
 * ==========================================
 * 출처 검색 옵션
 * ==========================================
 */

const SOURCE_SEARCH_OPTIONS = [
    {
        value: "TASK",
        label: "업무",
    },
    {
        value: "TASK_COMMENT",
        label: "업무 댓글",
    },
    {
        value: "NOTE",
        label: "노트",
    },
    {
        value: "NOTE_COMMENT",
        label: "노트 댓글",
    },
    {
        value: "FILE",
        label: "파일함",
    },
];


/*
 * ==========================================
 * 파일 형태 검색 옵션
 * ==========================================
 */

const FILE_TYPE_SEARCH_OPTIONS = [
    {
        value: ".jpg",
        label: ".jpg",
    },
    {
        value: ".txt",
        label: ".txt",
    },
    {
        value: ".hwp",
        label: ".hwp",
    },
    {
        value: ".hwpx",
        label: ".hwpx",
    },
    {
        value: ".gif",
        label: ".gif",
    },
    {
        value: ".docx",
        label: ".docx",
    },
    {
        value: ".pdf",
        label: ".pdf",
    },
    {
        value: ".webp",
        label: ".webp",
    },
];


/*
 * ==========================================
 * 정렬
 * ==========================================
 */

const SORT_OPTIONS = [
    {
        value: "date-desc",
        label: "최신순",
    },
    {
        value: "date-asc",
        label: "오래된순",
    },
    {
        value: "name-asc",
        label: "파일명순",
    },
    {
        value: "name-desc",
        label: "파일명 역순",
    },
    {
        value: "size-desc",
        label: "큰 파일순",
    },
    {
        value: "size-asc",
        label: "작은 파일순",
    },
];


export default function Files({
    source = "FILE",
    sourceNo = null,
}) {

    const { projectNo } = useParams();

    const navigate = useNavigate();

    const [files, setFiles] = useState([]);

    const [loginUser, setLoginUser] = useState("");

    const [loginRole, setLoginRole] = useState("");

    const [projectStatus, setProjectStatus] = useState("");


    /*
     * 검색 상태
     */

    const [searchType, setSearchType] = useState("name");

    const [keyword, setKeyword] = useState("");

    const [sourceKeyword, setSourceKeyword] = useState("");

    const [fileTypeKeyword, setFileTypeKeyword] = useState("");


    /*
     * 정렬 / 로딩
     */

    const [sortType, setSortType] = useState("date-desc");

    const [loading, setLoading] = useState(false);

    const [uploading, setUploading] = useState(false);


    /*
     * 이미지 미리보기
     */

    const [previewFile, setPreviewFile] = useState(null);

    const [previewError, setPreviewError] = useState(false);


    const fileInputRef = useRef(null);


    /*
     * Record
     */

    const [recordModalOpen, setRecordModalOpen] = useState(false);

    const [recordTargetFile, setRecordTargetFile] = useState(null);


    const { project } = useOutletContext();

    const isClosed =
        project?.projectStatus === "closed";

    const isProjectClosed =
        String(projectStatus || "").toLowerCase() === "closed";


    /*
     * ==========================================
     * 출처 이름
     * ==========================================
     */

    const getSourceLabel = (fileSource) => {

        if (!fileSource) {
            return "-";
        }

        return SOURCE_LABEL[fileSource] || fileSource;
    };


    /*
     * ==========================================
     * 출처 번호 존재 여부
     * ==========================================
     */

    const hasSourceNo = (file) => {

        return (
            file &&
            file.attachSourceNo !== null &&
            file.attachSourceNo !== undefined &&
            file.attachSourceNo !== ""
        );
    };


    /*
     * ==========================================
     * 출처 클릭 가능 여부
     * ==========================================
     */

    const isSourceClickable = (file) => {

        if (!file || !file.attachSource) {
            return false;
        }

        if (!hasSourceNo(file)) {
            return false;
        }

        return [
            "NOTE",
            "NOTE_COMMENT",
            "TASK",
            "TASK_COMMENT",
        ].includes(file.attachSource);
    };


    /*
     * ==========================================
     * 출처 원본 이동
     * ==========================================
     */

    const handleSourceClick = async (e, file) => {

        e.stopPropagation();

        if (!isSourceClickable(file)) {
            return;
        }

        const sourceType = file.attachSource;

        const sourceNo = file.attachSourceNo;

        try {

            if (sourceType === "NOTE") {

                navigate(
                    `/projects/${projectNo}/note/${sourceNo}`
                );

                return;
            }


            if (sourceType === "TASK") {

                navigate(
                    `/projects/${projectNo}/task?taskNo=${sourceNo}`
                );

                return;
            }


            if (sourceType === "NOTE_COMMENT") {

                const response =
                    await apiClient.get(
                        `/note/comment/${sourceNo}`
                    );

                const comment = response.data;

                if (
                    !comment ||
                    comment.noteNo === null ||
                    comment.noteNo === undefined
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


            if (sourceType === "TASK_COMMENT") {

                const response =
                    await apiClient.get(
                        `/task/comment/${sourceNo}`
                    );

                const comment = response.data;

                if (
                    !comment ||
                    comment.taskNo === null ||
                    comment.taskNo === undefined
                ) {

                    toast.warning(
                        "댓글의 원본 업무를 찾을 수 없습니다."
                    );

                    return;
                }

                navigate(
                    `/projects/${projectNo}/task?taskNo=${comment.taskNo}`
                );

                return;
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
                error.response?.data?.message ||
                "원본으로 이동하는 중 오류가 발생했습니다."
            );
        }
    };


    /*
     * ==========================================
     * 파일 목록 조회
     * ==========================================
     */

    const fetchFiles = async (
        searchKeyword = keyword,
        currentSearchType = searchType
    ) => {

        if (!projectNo) {

            console.error(
                "프로젝트 번호가 없습니다."
            );

            setFiles([]);

            setProjectStatus("");

            return;
        }


        const validSearchTypes = [
            "name",
            "source",
            "uploader",
            "type",
        ];


        const normalizedSearchType =
            validSearchTypes.includes(currentSearchType)
                ? currentSearchType
                : "name";


        const trimmedKeyword =
            String(searchKeyword ?? "").trim();


        try {

            setLoading(true);


            let url =
                `/attach/list/${projectNo}`;


            if (trimmedKeyword) {

                const params =
                    new URLSearchParams();

                params.append(
                    "keyword",
                    trimmedKeyword
                );

                params.append(
                    "searchType",
                    normalizedSearchType
                );

                url += `?${params.toString()}`;
            }


            const response =
                await apiClient.get(url);


            console.log(
                "프로젝트 번호:",
                projectNo
            );

            console.log(
                "검색 종류:",
                normalizedSearchType
            );

            console.log(
                "검색어:",
                trimmedKeyword
            );

            console.log(
                "파일 목록:",
                response.data
            );


            setFiles(
                Array.isArray(
                    response.data?.files
                )
                    ? response.data.files
                    : []
            );


            setLoginUser(
                response.data?.loginUser || ""
            );


            setLoginRole(
                response.data?.loginRole || ""
            );


            setProjectStatus(
                response.data?.projectStatus || ""
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


            toast.error(
                error.response?.data?.message ||
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

        setProjectStatus("");

        fetchFiles("", "name");

    }, [projectNo]);


    /*
     * ==========================================
     * 검색 종류 변경
     * ==========================================
     */

    const handleSearchTypeChange = (e) => {

        const newType =
            e.target.value;

        setSearchType(newType);

        setKeyword("");

        setSourceKeyword("");

        setFileTypeKeyword("");
    };


    /*
     * ==========================================
     * 출처 선택 즉시 검색
     * ==========================================
     */

    const handleSourceChange = (e) => {

        const value =
            e.target.value;

        setSourceKeyword(value);

        fetchFiles(
            value,
            "source"
        );
    };


    /*
     * ==========================================
     * 파일 형태 선택 즉시 검색
     * ==========================================
     */

    const handleFileTypeChange = (e) => {

        const value =
            e.target.value;

        setFileTypeKeyword(value);

        fetchFiles(
            value,
            "type"
        );
    };


    /*
     * ==========================================
     * 검색
     * ==========================================
     */

    const handleSearch = () => {

        if (searchType === "source") {

            fetchFiles(
                sourceKeyword,
                searchType
            );

            return;
        }


        if (searchType === "type") {

            fetchFiles(
                fileTypeKeyword,
                searchType
            );

            return;
        }


        fetchFiles(
            keyword,
            searchType
        );
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

        fetchFiles(
            "",
            searchType
        );
    };


    /*
     * ==========================================
     * Enter 검색
     * ==========================================
     */

    const handleSearchKeyDown = (e) => {

        if (
            searchType === "source" ||
            searchType === "type"
        ) {
            return;
        }


        if (e.key === "Enter") {

            handleSearch();
        }
    };


    /*
     * ==========================================
     * 정렬
     * ==========================================
     */

    const handleSortChange = (e) => {

        setSortType(
            e.target.value
        );
    };


    /*
     * ==========================================
     * 정렬된 파일
     * ==========================================
     */

    const sortedFiles =
        [...files].sort((a, b) => {

            let result = 0;


            if (
                sortType === "name-asc" ||
                sortType === "name-desc"
            ) {

                const nameA =
                    String(
                        a.attachName || ""
                    ).toLowerCase();


                const nameB =
                    String(
                        b.attachName || ""
                    ).toLowerCase();


                result =
                    nameA.localeCompare(
                        nameB,
                        "ko",
                        {
                            numeric: true,
                            sensitivity: "base",
                        }
                    );


                if (
                    sortType === "name-desc"
                ) {
                    result = -result;
                }

            } else if (
                sortType === "date-asc" ||
                sortType === "date-desc"
            ) {

                const dateA =
                    new Date(
                        a.attachCtime || 0
                    ).getTime();


                const dateB =
                    new Date(
                        b.attachCtime || 0
                    ).getTime();


                const safeDateA =
                    Number.isNaN(dateA)
                        ? 0
                        : dateA;


                const safeDateB =
                    Number.isNaN(dateB)
                        ? 0
                        : dateB;


                result =
                    safeDateA - safeDateB;


                if (
                    sortType === "date-desc"
                ) {
                    result = -result;
                }

            } else if (
                sortType === "size-asc" ||
                sortType === "size-desc"
            ) {

                const sizeA =
                    Number(
                        a.attachSize || 0
                    );


                const sizeB =
                    Number(
                        b.attachSize || 0
                    );


                result =
                    sizeA - sizeB;


                if (
                    sortType === "size-desc"
                ) {
                    result = -result;
                }
            }


            return result;
        });


    /*
     * ==========================================
     * 업로드 버튼
     * ==========================================
     */

    const handleUploadClick = () => {

        if (uploading) {
            return;
        }


        if (!projectNo) {

            toast.warning(
                "프로젝트 정보가 없습니다."
            );

            return;
        }


        if (isProjectClosed) {

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

    const handleFileChange = async (e) => {

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


        if (isProjectClosed) {

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
            sourceNo !== undefined &&
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
             * 현재 검색 조건 유지
             */

            let currentKeyword =
                keyword;


            if (searchType === "source") {

                currentKeyword =
                    sourceKeyword;
            }


            if (searchType === "type") {

                currentKeyword =
                    fileTypeKeyword;
            }


            await fetchFiles(
                currentKeyword,
                searchType
            );


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
                error.response?.data?.message ||
                "파일 업로드 중 오류가 발생했습니다."
            );

        } finally {

            setUploading(false);

            e.target.value = "";
        }
    };


    /*
     * ==========================================
     * 확장자
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
     * 파일 타입
     * ==========================================
     */

    const getFileType = (
        fileName = ""
    ) => {

        const extension =
            getExtension(fileName);


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


        if (extension === "pdf") {
            return "pdf";
        }


        if (
            [
                "doc",
                "docx",
            ].includes(extension)
        ) {
            return "word";
        }


        if (
            [
                "xls",
                "xlsx",
            ].includes(extension)
        ) {
            return "excel";
        }


        if (
            [
                "ppt",
                "pptx",
            ].includes(extension)
        ) {
            return "powerpoint";
        }


        if (
            [
                "zip",
                "rar",
                "7z",
            ].includes(extension)
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

    const getFileUrl = (attachNo) => {

        if (!attachNo) {
            return "";
        }

        return `http://localhost:8080/api/attach/${attachNo}`;
    };


    /*
     * ==========================================
     * 이미지 미리보기
     * ==========================================
     */

    const handlePreview = (file) => {

        const type =
            getFileType(file.attachName);


        if (type !== "image") {
            return;
        }


        setPreviewError(false);

        setPreviewFile(file);
    };


    const closePreview = () => {

        setPreviewFile(null);

        setPreviewError(false);
    };


    /*
     * ==========================================
     * ESC
     * ==========================================
     */

    useEffect(() => {

        const handleKeyDown = (e) => {

            if (
                e.key === "Escape" &&
                previewFile
            ) {
                closePreview();
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

    }, [previewFile]);


    /*
     * ==========================================
     * 다운로드
     * ==========================================
     */

    const handleDownload = (attachNo) => {

        if (!attachNo) {
            return;
        }

        window.location.href =
            getFileUrl(attachNo);
    };


    /*
     * ==========================================
     * 삭제
     * ==========================================
     */

    const handleDelete = async (
        attachNo,
        fileName
    ) => {

        const result =
            await Swal.fire({
                title: "파일을 삭제하시겠습니까?",
                html: `
                    <strong>"${fileName}"</strong> 파일이 삭제됩니다.
                    <br>
                    <span style="
                        font-size: 13px;
                        color: #64748b;
                    ">
                        삭제한 파일은 복구할 수 없습니다.
                    </span>
                `,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#e11d48",
                cancelButtonColor: "#94a3b8",
                confirmButtonText: "삭제",
                cancelButtonText: "취소",
                reverseButtons: true,
            });


        if (!result.isConfirmed) {
            return;
        }


        try {

            await apiClient.delete(
                `/attach/${attachNo}`
            );


            if (
                previewFile?.attachNo ===
                attachNo
            ) {
                closePreview();
            }


            setFiles(
                prev =>
                    prev.filter(
                        file =>
                            file.attachNo !==
                            attachNo
                    )
            );


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


            toast.error(
                error.response?.data?.message ||
                "파일 삭제 중 오류가 발생했습니다."
            );
        }
    };


    /*
     * ==========================================
     * Record
     * ==========================================
     */

    const handleRecord = (file) => {

        setRecordTargetFile(file);

        setRecordModalOpen(true);
    };


    const closeRecordModal = () => {

        setRecordModalOpen(false);

        setRecordTargetFile(null);
    };


    /*
     * ==========================================
     * 삭제 가능 여부
     * ==========================================
     */

    const canDeleteFile = (file) => {

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
                file?.attachUploader ?? ""
            );


        if (role === "owner") {
            return true;
        }


        if (role === "manager") {
            return true;
        }


        if (role === "member") {

            return (
                currentUser !== "" &&
                currentUser === uploader
            );
        }


        return false;
    };


    /*
     * ==========================================
     * 파일 크기
     * ==========================================
     */

    const formatFileSize = (size) => {

        if (
            size === null ||
            size === undefined
        ) {
            return "-";
        }


        if (size < 1024) {
            return `${size} B`;
        }


        if (
            size <
            1024 * 1024
        ) {

            return `${(
                size / 1024
            ).toFixed(1)} KB`;
        }


        if (
            size <
            1024 * 1024 * 1024
        ) {

            return `${(
                size /
                (1024 * 1024)
            ).toFixed(1)} MB`;
        }


        return `${(
            size /
            (1024 * 1024 * 1024)
        ).toFixed(1)} GB`;
    };


    /*
     * ==========================================
     * 날짜
     * ==========================================
     */

    const formatDate = (date) => {

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
            ).padStart(2, "0");


        const day =
            String(
                d.getDate()
            ).padStart(2, "0");


        return `${year}.${month}.${day}`;
    };


    /*
     * ==========================================
     * 파일 아이콘
     * ==========================================
     */

    const FileIcon = ({ file }) => {

        const type =
            getFileType(file.attachName);


        if (type === "image") {

            return (
                <div className="files-image-thumbnail">

                    <img
                        src={getFileUrl(file.attachNo)}
                        alt={file.attachName}
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

                    <div className="files-image-fallback">
                        <span>이미지 없음</span>
                    </div>

                </div>
            );
        }


        if (type === "pdf") {

            return (
                <div className="files-icon files-icon-pdf">
                    <span>PDF</span>
                </div>
            );
        }


        if (type === "word") {

            return (
                <div className="files-icon files-icon-word">
                    <span>W</span>
                </div>
            );
        }


        if (type === "excel") {

            return (
                <div className="files-icon files-icon-excel">
                    <span>X</span>
                </div>
            );
        }


        if (type === "powerpoint") {

            return (
                <div className="files-icon files-icon-powerpoint">
                    <span>P</span>
                </div>
            );
        }


        if (type === "zip") {

            return (
                <div className="files-icon files-icon-zip">
                    <span>ZIP</span>
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

    const SearchIcon = () => {

        return (
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
    };


    /*
     * ==========================================
     * 업로드 아이콘
     * ==========================================
     */

    const UploadIcon = () => {

        return (
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
    };


    /*
     * ==========================================
     * 다운로드 아이콘
     * ==========================================
     */

    const DownloadIcon = () => {

        return (
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
    };


    /*
     * ==========================================
     * 삭제 아이콘
     * ==========================================
     */

    const DeleteIcon = () => {

        return (
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
    };


    /*
     * ==========================================
     * 닫기 아이콘
     * ==========================================
     */

    const CloseIcon = () => {

        return (
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
    };


    /*
     * ==========================================
     * 검색 입력 영역
     * ==========================================
     */

    const renderSearchInput = () => {

        /*
         * 출처
         */

        if (searchType === "source") {

            return (
                <select
                    className="files-source-search-select"
                    aria-label="출처 선택"
                    value={sourceKeyword}
                    onChange={handleSourceChange}
                >

                    <option value="">
                        출처 선택
                    </option>

                    {SOURCE_SEARCH_OPTIONS.map(
                        (option) => (

                            <option
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </option>
                        )
                    )}

                </select>
            );
        }


        /*
         * 파일 형태
         */

        if (searchType === "type") {

            return (
                <select
                    className="files-type-search-select"
                    aria-label="파일 형태 선택"
                    value={fileTypeKeyword}
                    onChange={handleFileTypeChange}
                >

                    <option value="">
                        파일 형태 선택
                    </option>

                    {FILE_TYPE_SEARCH_OPTIONS.map(
                        (option) => (

                            <option
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
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
                aria-label={
                    `${SEARCH_TYPE_LABEL[searchType]} 검색어`
                }
                placeholder={
                    `${SEARCH_TYPE_LABEL[searchType]} 검색`
                }
                value={keyword}
                onChange={(e) =>
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
     * Record 아이콘
     * ==========================================
     */

    const RecordIcon = () => {

        return (
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
    };


    /*
     * ==========================================
     * 화면
     * ==========================================
     */

    return (
        <div className="files-page">

            <div className="files-container">

                <div className="files-toolbar">

                    <div className="files-search-area">

                        <select
                            className="files-search-type"
                            value={searchType}
                            onChange={
                                handleSearchTypeChange
                            }
                        >

                            {SEARCH_TYPE_OPTIONS.map(
                                (option) => (

                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                )
                            )}

                        </select>


                        <div
                            className={
                                `files-search ${
                                    searchType === "source"
                                        ? "files-search-source"
                                        : ""
                                } ${
                                    searchType === "type"
                                        ? "files-search-type-mode"
                                        : ""
                                }`
                            }
                        >

                            {renderSearchInput()}

                            {searchType !== "source" &&
                                searchType !== "type" && (

                                    <button
                                        type="button"
                                        onClick={handleSearch}
                                        aria-label="검색"
                                    >
                                        <SearchIcon />
                                    </button>
                                )}

                        </div>


                        {(
                            keyword ||
                            sourceKeyword ||
                            fileTypeKeyword
                        ) && (

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
                            value={sortType}
                            onChange={
                                handleSortChange
                            }
                            aria-label="파일 정렬"
                        >

                            {SORT_OPTIONS.map(
                                (option) => (

                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
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
                            disabled={uploading}
                        >

                            <UploadIcon />

                            <span>
                                {
                                    uploading
                                        ? "업로드 중..."
                                        : "파일 업로드"
                                }
                            </span>

                        </button>
                    )}


                    <input
                        ref={fileInputRef}
                        type="file"
                        className="files-hidden-input"
                        onChange={
                            handleFileChange
                        }
                    />

                </div>


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


                    {loading && (

                        <div className="files-empty">
                            파일을 불러오는 중입니다.
                        </div>
                    )}


                    {!loading &&
                        files.length === 0 && (

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
                                    {
                                        keyword ||
                                        sourceKeyword ||
                                        fileTypeKeyword
                                            ? "검색 결과가 없습니다."
                                            : "등록된 파일이 없습니다."
                                    }
                                </p>

                            </div>
                        )}


                    {!loading &&
                        sortedFiles.map((file) => {

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
                                    className={
                                        `files-list-row ${
                                            type === "image"
                                                ? "files-image-row"
                                                : ""
                                        }`
                                    }
                                    key={
                                        file.attachNo
                                    }
                                    onClick={() =>
                                        handlePreview(
                                            file
                                        )
                                    }
                                >

                                    <div className="files-col-file files-file-name">

                                        <FileIcon
                                            file={file}
                                        />

                                        <span className="files-name-text">
                                            {
                                                file.attachName
                                            }
                                        </span>

                                    </div>


                                    <div
                                        className={
                                            `files-col-source ${
                                                sourceClickable
                                                    ? "files-source-clickable"
                                                    : ""
                                            }`
                                        }
                                        onClick={(e) =>
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
                                        {
                                            getSourceLabel(
                                                file.attachSource
                                            )
                                        }
                                    </div>


                                    <div className="files-col-uploader">
                                        {
                                            file.empName ||
                                            file.attachUploader ||
                                            "-"
                                        }
                                    </div>


                                    <div className="files-col-date">
                                        {
                                            formatDate(
                                                file.attachCtime
                                            )
                                        }
                                    </div>


                                    <div className="files-col-download">

                                        <button
                                            type="button"
                                            className="files-download-button"
                                            onClick={(e) => {

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


                                    <div className="files-col-size">
                                        {
                                            formatFileSize(
                                                file.attachSize
                                            )
                                        }
                                    </div>


                                    <div className="files-col-record">

                                        {!isClosed && (

                                            <button
                                                type="button"
                                                className="files-record-button"
                                                onClick={(e) => {

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


                                    <div className="files-col-delete">

                                        {canDeleteFile(file) && (

                                            <button
                                                type="button"
                                                className="files-delete-button"
                                                onClick={(e) => {

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
                        })}

                </div>

            </div>


            {previewFile && (

                <div
                    className="files-preview-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closePreview();
                        }
                    }}
                >

                    <div className="files-preview-modal">

                        <div className="files-preview-header">

                            <div className="files-preview-title">

                                <div className="files-preview-image-icon">

                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    >
                                        <rect
                                            x="3"
                                            y="3"
                                            width="18"
                                            height="18"
                                            rx="2"
                                        />

                                        <circle
                                            cx="8.5"
                                            cy="8.5"
                                            r="1.5"
                                        />

                                        <path d="M3 17l5-5 4 4 2.5-2.5L21 20" />
                                    </svg>

                                </div>


                                <span>
                                    {
                                        previewFile.attachName
                                    }
                                </span>

                            </div>


                            <div className="files-preview-actions">

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleDownload(
                                            previewFile.attachNo
                                        )
                                    }
                                    title="다운로드"
                                >
                                    <DownloadIcon />
                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        closePreview
                                    }
                                    title="닫기"
                                >
                                    <CloseIcon />
                                </button>

                            </div>

                        </div>


                        <div className="files-preview-body">

                            {!previewError ? (

                                <img
                                    src={
                                        getFileUrl(
                                            previewFile.attachNo
                                        )
                                    }
                                    alt={
                                        previewFile.attachName
                                    }
                                    className="files-preview-image"
                                    onError={() =>
                                        setPreviewError(
                                            true
                                        )
                                    }
                                />

                            ) : (

                                <div className="files-preview-error">

                                    <div className="files-preview-error-icon">

                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        >
                                            <rect
                                                x="3"
                                                y="3"
                                                width="18"
                                                height="18"
                                                rx="2"
                                            />

                                            <path d="M8 15l2.5-3 2 2 2-2.5L17 15" />

                                            <path d="M8 8h.01" />
                                        </svg>

                                    </div>

                                    <strong>
                                        이미지를 불러올 수 없습니다.
                                    </strong>

                                    <span>
                                        이미지 없음
                                    </span>

                                </div>
                            )}

                        </div>

                    </div>

                </div>
            )}


            {recordTargetFile && (

                <RecordLinkModal
                    show={recordModalOpen}
                    onHide={closeRecordModal}
                    projectNo={projectNo}
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
