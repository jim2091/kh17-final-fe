import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../utils/reaxios";
import "./Files.css";

export default function Files({ source = "파일함" }) {

    const { projectNo } = useParams();

    // 프로젝트 정보
    const [project, setProject] = useState(null);

    // 파일 목록
    const [files, setFiles] = useState([]);

    // 현재 로그인 사용자
    const [loginUser, setLoginUser] = useState("");

    // 검색어
    const [keyword, setKeyword] = useState("");

    // 상태
    const [loading, setLoading] = useState(false);
    const [projectLoading, setProjectLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // 이미지 미리보기
    const [previewFile, setPreviewFile] = useState(null);
    const [previewError, setPreviewError] = useState(false);

    // 파일 input
    const fileInputRef = useRef(null);


    // ==================================================
    // 프로젝트 정보 조회
    // ==================================================

    const fetchProject = async () => {

        if (!projectNo) {
            setProjectLoading(false);
            return;
        }

        try {

            setProjectLoading(true);

            const response =
                await apiClient.get(
                    `/project/${projectNo}`
                );

            console.log(
                "프로젝트 정보:",
                response.data
            );

            setProject(response.data);

        } catch (error) {

            console.error(
                "프로젝트 정보 조회 실패:",
                error
            );

            setProject(null);

        } finally {

            setProjectLoading(false);

        }
    };


    // ==================================================
    // 파일 목록 조회
    // ==================================================

    const fetchFiles = async (searchKeyword = "") => {

        if (!projectNo) {
            return;
        }

        try {

            setLoading(true);

            let url =
                `/attach/list/${projectNo}`;

            if (searchKeyword.trim()) {

                url +=
                    `?keyword=${encodeURIComponent(
                        searchKeyword.trim()
                    )}`;

            }

            const response =
                await apiClient.get(url);

            console.log(
                "파일 목록:",
                response.data
            );

            setFiles(
                Array.isArray(response.data.files)
                    ? response.data.files
                    : []
            );

            setLoginUser(
                response.data.loginUser || ""
            );

            console.log(
                "현재 로그인 사용자:",
                response.data.loginUser
            );

        } catch (error) {

            console.error(
                "파일 목록 조회 실패:",
                error
            );

            setFiles([]);

            setLoginUser("");

            alert(
                "파일 목록을 불러오는 중 오류가 발생했습니다."
            );

        } finally {

            setLoading(false);

        }
    };


    // ==================================================
    // 프로젝트 번호 변경
    // ==================================================

    useEffect(() => {

        fetchProject();
        fetchFiles();

    }, [projectNo]);


    // ==================================================
    // 검색
    // ==================================================

    const handleSearch = () => {

        fetchFiles(keyword);

    };


    // ==================================================
    // 엔터 검색
    // ==================================================

    const handleSearchKeyDown = (e) => {

        if (e.key === "Enter") {
            handleSearch();
        }

    };


    // ==================================================
    // 업로드 버튼
    // ==================================================

    const handleUploadClick = () => {

        if (!projectNo) {

            alert(
                "프로젝트 정보가 없습니다."
            );

            return;
        }

        if (projectLoading) {

            alert(
                "프로젝트 정보를 불러오는 중입니다."
            );

            return;
        }

        if (!project) {

            alert(
                "프로젝트 정보를 확인할 수 없습니다."
            );

            return;
        }

        fileInputRef.current?.click();

    };


    // ==================================================
    // 파일 업로드
    // ==================================================

    const handleFileChange = async (e) => {

        const file =
            e.target.files?.[0];

        if (!file) {
            return;
        }

        if (!projectNo) {

            alert(
                "프로젝트 정보가 없습니다."
            );

            e.target.value = "";

            return;
        }

        if (!project) {

            alert(
                "프로젝트 정보를 확인할 수 없습니다."
            );

            e.target.value = "";

            return;
        }

        const formData = new FormData();

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
            source
        );

        try {

            setUploading(true);

            const response =
                await apiClient.post(
                    "/attach/upload",
                    formData
                );

            console.log(
                "업로드된 파일 번호:",
                response.data
            );

            await fetchFiles(keyword);

            alert(
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

            alert(
                error.response?.data?.message ||
                "파일 업로드 중 오류가 발생했습니다."
            );

        } finally {

            setUploading(false);

            e.target.value = "";

        }
    };


    // ==================================================
    // 파일 확장자
    // ==================================================

    const getExtension = (fileName = "") => {

        const index =
            fileName.lastIndexOf(".");

        if (index === -1) {
            return "";
        }

        return fileName
            .substring(index + 1)
            .toLowerCase();
    };


    // ==================================================
    // 파일 종류
    // ==================================================

    const getFileType = (fileName = "") => {

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
                "bmp"
            ].includes(extension)
        ) {
            return "image";
        }

        if (extension === "pdf") {
            return "pdf";
        }

        if (
            ["doc", "docx"].includes(extension)
        ) {
            return "word";
        }

        if (
            ["xls", "xlsx"].includes(extension)
        ) {
            return "excel";
        }

        if (
            ["ppt", "pptx"].includes(extension)
        ) {
            return "powerpoint";
        }

        if (
            ["zip", "rar", "7z"].includes(extension)
        ) {
            return "zip";
        }

        return "file";
    };


    // ==================================================
    // 파일 URL
    // ==================================================

    const getFileUrl = (attachNo) => {

        if (!attachNo) {
            return "";
        }

        return `http://localhost:8080/api/attach/${attachNo}`;

    };


    // ==================================================
    // 이미지 미리보기 열기
    // ==================================================

    const handlePreview = (file) => {

        const type =
            getFileType(file.attachName);

        // 이미지만 미리보기
        if (type !== "image") {
            return;
        }

        setPreviewError(false);

        setPreviewFile(file);

    };


    // ==================================================
    // 이미지 미리보기 닫기
    // ==================================================

    const closePreview = () => {

        setPreviewFile(null);
        setPreviewError(false);

    };


    // ==================================================
    // ESC로 미리보기 닫기
    // ==================================================

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


    // ==================================================
    // 다운로드
    // ==================================================

    const handleDownload = (attachNo) => {

        if (!attachNo) {
            return;
        }

        window.location.href =
            getFileUrl(attachNo);

    };


    // ==================================================
    // 삭제
    // ==================================================

    const handleDelete = async (attachNo) => {

        const result =
            window.confirm(
                "이 파일을 삭제하시겠습니까?"
            );

        if (!result) {
            return;
        }

        try {

            await apiClient.delete(
                `/attach/${attachNo}`
            );

            // 현재 미리보기 중인 파일이면 닫기
            if (
                previewFile?.attachNo === attachNo
            ) {
                closePreview();
            }

            // 화면에서도 즉시 삭제
            setFiles((prev) =>
                prev.filter(
                    (file) =>
                        file.attachNo !== attachNo
                )
            );

            alert(
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

            alert(
                error.response?.data?.message ||
                "파일 삭제 중 오류가 발생했습니다."
            );

        }

    };


    // ==================================================
    // 파일 크기
    // ==================================================

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

        if (size < 1024 * 1024) {

            return `${(
                size / 1024
            ).toFixed(1)} KB`;

        }

        if (size < 1024 * 1024 * 1024) {

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


    // ==================================================
    // 날짜
    // ==================================================

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


    // ==================================================
    // 파일 아이콘
    // ==================================================

    const FileIcon = ({ file }) => {

        const type =
            getFileType(file.attachName);

        // ==========================================
        // 이미지
        // ==========================================

        if (type === "image") {

            return (
                <div className="files-image-thumbnail">

                    <img
                        src={getFileUrl(file.attachNo)}
                        alt={file.attachName}
                        onError={(e) => {

                            e.currentTarget.style.display =
                                "none";

                            e.currentTarget.nextElementSibling.style.display =
                                "flex";

                        }}
                    />

                    <div className="files-image-fallback">
                        <span>이미지 없음</span>
                    </div>

                </div>
            );

        }


        // ==========================================
        // PDF
        // ==========================================

        if (type === "pdf") {

            return (
                <div className="files-icon files-icon-pdf">
                    <span>PDF</span>
                </div>
            );

        }


        // ==========================================
        // Word
        // ==========================================

        if (type === "word") {

            return (
                <div className="files-icon files-icon-word">
                    <span>W</span>
                </div>
            );

        }


        // ==========================================
        // Excel
        // ==========================================

        if (type === "excel") {

            return (
                <div className="files-icon files-icon-excel">
                    <span>X</span>
                </div>
            );

        }


        // ==========================================
        // PowerPoint
        // ==========================================

        if (type === "powerpoint") {

            return (
                <div className="files-icon files-icon-powerpoint">
                    <span>P</span>
                </div>
            );

        }


        // ==========================================
        // ZIP
        // ==========================================

        if (type === "zip") {

            return (
                <div className="files-icon files-icon-zip">
                    <span>ZIP</span>
                </div>
            );

        }


        // ==========================================
        // 일반 파일
        // ==========================================

        return (
            <div className="files-icon files-icon-default">

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


    // ==================================================
    // 검색 아이콘
    // ==================================================

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

                <path
                    d="m16 16 5 5"
                />

            </svg>
        );

    };


    // ==================================================
    // 업로드 아이콘
    // ==================================================

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


    // ==================================================
    // 다운로드 아이콘
    // ==================================================

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


    // ==================================================
    // 삭제 아이콘
    // ==================================================

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


    // ==================================================
    // 미리보기 닫기 아이콘
    // ==================================================

    const CloseIcon = () => {

        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            >

                <path d="M6 6l12 12" />

                <path d="M18 6L6 18" />

            </svg>
        );

    };


    // ==================================================
    // 화면
    // ==================================================

    return (

        <div className="files-page">

            <div className="files-container">

                {/* ==========================================
                    검색 + 업로드
                ========================================== */}

                <div className="files-toolbar">

                    <div className="files-search">

                        <input
                            type="text"
                            placeholder="파일명 검색으로 프로젝트 파일 검색 가능"
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

                        <button
                            type="button"
                            onClick={
                                handleSearch
                            }
                            aria-label="검색"
                        >
                            <SearchIcon />
                        </button>

                    </div>


                    <button
                        type="button"
                        className="files-upload-button"
                        onClick={
                            handleUploadClick
                        }
                        disabled={
                            uploading ||
                            projectLoading ||
                            !projectNo
                        }
                    >

                        <UploadIcon />

                        <span>
                            {uploading
                                ? "업로드 중..."
                                : "파일 업로드"}
                        </span>

                    </button>


                    <input
                        ref={fileInputRef}
                        type="file"
                        className="files-hidden-input"
                        onChange={
                            handleFileChange
                        }
                    />

                </div>


                {/* ==========================================
                    파일 목록
                ========================================== */}

                <div className="files-list">

                    {/* 헤더 */}

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

                        <div className="files-col-delete">
                            삭제
                        </div>

                    </div>


                    {/* 로딩 */}

                    {loading && (

                        <div className="files-empty">
                            파일을 불러오는 중입니다.
                        </div>

                    )}


                    {/* 파일 없음 */}

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

                                        <path
                                            d="M4 7h5l2 2h9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"
                                        />

                                        <path
                                            d="M4 7V5a2 2 0 0 1 2-2h4l2 2"
                                        />

                                    </svg>

                                </div>

                                <p>
                                    등록된 파일이 없습니다.
                                </p>

                            </div>

                        )}


                    {/* 파일 목록 */}

                    {!loading &&
                        files.map((file) => {

                            const type =
                                getFileType(
                                    file.attachName
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
                                    key={file.attachNo}
                                    onClick={() =>
                                        handlePreview(file)
                                    }
                                >

                                    {/* 파일명 */}

                                    <div className="files-col-file files-file-name">

                                        <FileIcon
                                            file={file}
                                        />

                                        <span className="files-name-text">
                                            {file.attachName}
                                        </span>

                                    </div>


                                    {/* 출처 */}

                                    <div className="files-col-source">

                                        {file.attachSource || "-"}

                                    </div>


                                    {/* 업로더 */}

                                    <div className="files-col-uploader">

                                        {file.empName || "-"}

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


                                    {/* 크기 */}

                                    <div className="files-col-size">

                                        {formatFileSize(
                                            file.attachSize
                                        )}

                                    </div>


                                    {/* 삭제 */}

                                    <div className="files-col-delete">

                                        {loginUser === file.attachUploader && (

                                            <button
                                                type="button"
                                                className="files-delete-button"
                                                onClick={(e) => {

                                                    e.stopPropagation();

                                                    handleDelete(
                                                        file.attachNo
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


            {/* ==================================================
                이미지 미리보기
            ================================================== */}

            {previewFile && (

                <div
                    className="files-preview-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target === e.currentTarget
                        ) {
                            closePreview();
                        }

                    }}
                >

                    <div className="files-preview-modal">

                        {/* ==========================================
                            미리보기 헤더
                        ========================================== */}

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

                                        <path
                                            d="M3 17l5-5 4 4 2.5-2.5L21 20"
                                        />

                                    </svg>

                                </div>

                                <span>
                                    {previewFile.attachName}
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


                        {/* ==========================================
                            이미지 영역
                        ========================================== */}

                        <div className="files-preview-body">

                            {!previewError ? (

                                <img
                                    src={getFileUrl(
                                        previewFile.attachNo
                                    )}
                                    alt={
                                        previewFile.attachName
                                    }
                                    className="files-preview-image"
                                    onError={() => {
                                        setPreviewError(true);
                                    }}
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

        </div>
    );
}
