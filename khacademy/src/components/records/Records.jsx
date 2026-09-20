import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Button, Modal, Form, Badge, FormGroup, FormLabel } from "react-bootstrap";
import { Plus, User, Search, SlidersHorizontal, ArrowUpDown, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";
import "./Records.css";
import Swal from "sweetalert2";

export default function Records() {

    const { projectNo } = useParams();
    const { project } = useOutletContext();
    const navigate = useNavigate();

    const isClosed = project?.projectStatus === "closed";

    //목록
    const [recordList, setRecordList] = useState([]);
    const [loading, setLoading] = useState(true);

    //목록 페이징
    const [page, setPage] = useState(1);
    const [last, setLast] = useState(true);//첫 조회도 안했는데 더보기 버튼이 나오는걸 방지
    const [moreLoading, setMoreLoading] = useState(false);
    const RECORD_PAGE_SIZE = 10;

    //목록 조회 조건
    //추후 상세 필터, 정렬, 내보내기에서도 그대로 사용할 예정
    const [searchCondition, setSearchCondition] = useState({
        type: "ALL",
        keyword: "",
        issueStatus: "ALL",
        relatedType: "ALL",
        writerNo: null,
        startDate: null,
        endDate: null,
        sort: "LATEST"
    });

    //검색창 입력값
    //입력할 때마다 조회하지 않고 검색 실행시 searchCondition에 반영
    const [searchKeyword, setSearchKeyword] = useState("");

    //프로젝트 record 요약
    const [recordSummary, setRecordSummary] = useState({
        totalCount: 0,
        decisionCount: 0,
        issueCount: 0,
        deliverableCount: 0,
        etcCount: 0,
        openIssueCount: 0,
        resolvedIssueCount: 0,
        latestRecordNo: null,
        latestRecordTitle: null,
        latestRecordAt: null
    });

    const [filterOpen, setFilterOpen] = useState(false);

    //상세 필터 영역
    const filterWrapperRef = useRef(null);

    const [filterCondition, setFilterCondition] = useState({
        issueStatus: "ALL",
        relatedType: "ALL",
        writerNo: "",
        startDate: "",
        endDate: ""
    });

    //상세 필터 바깥 클릭 / ESC 닫기
    useEffect(() => {

        if(!filterOpen) return;


        //필터 영역 바깥 클릭
        const handleOutsideClick = (e) => {

            if(
                filterWrapperRef.current
                && !filterWrapperRef.current.contains(e.target)
            ) {
                setFilterOpen(false);
            }

        };


        //ESC
        const handleKeyDown = (e) => {

            if(e.key === "Escape") {
                setFilterOpen(false);
            }

        };


        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        document.addEventListener(
            "keydown",
            handleKeyDown
        );


        return () => {

            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );

            document.removeEventListener(
                "keydown",
                handleKeyDown
            );

        };

    }, [filterOpen]);

    //작성자 필터용 프로젝트 멤버 목록
    const [memberList, setMemberList] = useState([]);

    //등록 모달
    const [addModalOpen, setAddModalOpen] = useState(false);

    const [recordType, setRecordType] = useState("")
    const [recordTitle, setRecordTitle] = useState("");
    const [recordContent, setRecordContent] = useState("");

    //중복 줄이고 업무, 노트, 파일 리스트를 relatedSource로 최대한 묶는 형태의 설계
    //원본 데이터 목록
    const [relatedSource, setRelatedSource] = useState({
        TASK: [],
        NOTE: [],
        ATTACH: []
    });

    //선택된 원본 데이터
    const [selectedRelatedList, setSelectedRelatedList] = useState([]);

    //원본 데이터 선택 모달
    const [relatedSelectModalOpen, setRelatedSelectModalOpen] = useState(false);
    const [relatedSelectType, setRelatedSelectType] = useState(null);

    //원본 데이터 검색어
    const [relatedKeyword, setRelatedKeyword] = useState("");

    //원본 데이터 목록 로딩
    const [relatedLoading, setRelatedLoading] = useState(false);

    //상세 모달
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const [selectedRecord, setSelectedRecord] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    //수정 모달
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRecordNo, setEditRecordNo] = useState(null);

    //수정/삭제 권한
    const isRecordWriter =
        project?.projectMemberNo === selectedRecord?.projectRecordWriterNo;

    const isManagerOrOwner =
        project?.projectMemberRole === "owner"
        || project?.projectMemberRole === "manager";

    const canManageRecord = isRecordWriter || isManagerOrOwner;

    //Record 수정/삭제/ISSUE 상태 변경 가능 여부
    const canChangeRecord = canManageRecord && !isClosed;

    //이슈 해결 모달
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [issueResolution, setIssueResolution] = useState("");

    //목록 조회
    const loadRecordList = useCallback(async (pageNo = 1, append = false) => {
        try {
            if(append) {
                setMoreLoading(true);
            }
            else{
                setLoading(true);
            }

            const { data } = await apiClient.post(
                `/record/project/${projectNo}/list`,
                {
                    ...searchCondition,
                    page: pageNo,
                    size: RECORD_PAGE_SIZE
                }
            );

            const newRecordList = data.recordList || [];

            if(append) {
                setRecordList(prev => [
                    ...prev,
                    ...newRecordList
                ]);
            }
            else {
                setRecordList(newRecordList);
            }

            setLast(data.last);

            return true;
        }
        catch (e) {
            console.error(e);
            toast.error("record 목록을 불러오지 못했습니다");

            return false;
        }
        finally {
            if(append) {
                setMoreLoading(false);
            }
            else {
                setLoading(false);
            }
        }
    }, [searchCondition]);

    //record 더보기
    const loadMoreRecord = useCallback(async () => {
        if(last || moreLoading) return;

        const nextPage = page + 1;

        const success = await loadRecordList(
            nextPage,
            true
        );

        if(success) {
            setPage(nextPage);
        }

    }, [page, last, moreLoading, loadRecordList]);

    //프로젝트 record 요약 조회
    const loadRecordSummary = useCallback(async () => {
        try {
            const { data } = await apiClient.get(
                `/record/project/${projectNo}/summary`
            );

            setRecordSummary(data);
        }
        catch (e) {
            console.error(e);
            toast.error("record 요약 정보를 불러오지 못했습니다");
        }
    }, []);

    //작성자 필터용 프로젝트 멤버 목록 조회
    const loadMemberList = useCallback(async () => {
        try {
            const { data } = await apiClient.get(
                `/project/${projectNo}/member`
            );

            setMemberList(data || []);
        }
        catch (e) {
            console.error(e);
            toast.error("프로젝트 멤버를 불러오지 못했습니다");
        }
    }, []);

    //record 목록 + 요약 새로고침
    const refreshRecordData = useCallback(async () => {

        setPage(1);

        await Promise.all([
            loadRecordList(1, false),
            loadRecordSummary()
        ]);
    }, [loadRecordList, loadRecordSummary]);

    //Record 등록용 원본 데이터 목록 조회
    const loadRelatedSource = useCallback(async () => {

        try {
            setRelatedLoading(true);
            const taskResponse = await apiClient.get(`/task/list/${projectNo}`);

            const taskList = taskResponse.data || [];

            const noteResponse = await apiClient.post(
                `/note/project/${projectNo}/list`,
                {
                    lastNo: null,
                    size: 100,
                    type: "all",
                    keyword: ""
                }
            );

            const noteList = noteResponse.data.noteList || [];

            const fileResponse = await apiClient.get(`/attach/list/${projectNo}`);

            const fileList = fileResponse.data.files || [];

            setRelatedSource({
                TASK: taskList,
                NOTE: noteList,
                ATTACH: fileList
            });
        }
        catch (e) {
            console.error(e);
            toast.error("관련 항목을 불러오지 못했습니다");
        }
        finally {
            setRelatedLoading(false);
        }
    }, []);

    //조회 조건이 변경되면 목록 재조회
    useEffect(() => {
        setPage(1);
        loadRecordList(1, false);
    }, [loadRecordList]);

    //프로젝트가 바뀌면 요약 조회
    useEffect(() => {
        loadRecordSummary();
    }, [loadRecordSummary]);

    //작성자 필터용
    useEffect(() => {
        loadMemberList();
    }, [loadMemberList]);


    //등록 모달 열기
    const openAddModal = useCallback(() => {
        setRecordType("");
        setRecordTitle("");
        setRecordContent("");

        setSelectedRelatedList([]);

        setRelatedSelectModalOpen(false);
        setRelatedSelectType(null);
        setRelatedKeyword("");

        loadRelatedSource();

        setAddModalOpen(true);
    }, []);

    //원본 데이터 선택 모달 열기
    const openRelatedSelectModal = useCallback((type) => {
        setRelatedSelectType(type);
        setRelatedKeyword("");
        setRelatedSelectModalOpen(true)
    }, [])

    //등록
    const addRecord = useCallback(async () => {
        if (!recordType) {
            toast.warning("타입을 선택해주세요");
            return;
        }
        if (recordTitle.trim().length === 0) {
            toast.warning("제목을 입력해주세요");
            return;
        }
        if (recordContent.trim().length === 0) {
            toast.warning("내용을 입력해주세요");
            return;
        }

        //선택된 원본 데이터를 타입별 번호 목록으로 변환
        const taskNoList = selectedRelatedList
            .filter(item => item.relatedType === "TASK")
            .map(item => item.relatedNo);
        const noteNoList = selectedRelatedList
            .filter(item => item.relatedType === "NOTE")
            .map(item => item.relatedNo);
        const attachNoList = selectedRelatedList
            .filter(item => item.relatedType === "ATTACH")
            .map(item => item.relatedNo);

        try {
            await apiClient.post(
                `/record/project/${projectNo}`,
                {
                    projectRecordType: recordType,
                    projectRecordTitle: recordTitle,
                    projectRecordContent: recordContent,
                    taskNoList: taskNoList,
                    noteNoList: noteNoList,
                    attachNoList: attachNoList
                }
            );
            toast.success("기록이 등록되었습니다");

            setAddModalOpen(false);

            await refreshRecordData();
        }
        catch (e) {
            console.error(e);
            toast.error("record 등록에 실패했습니다");
        }
    }, [recordType, recordTitle, recordContent, selectedRelatedList]);

    //상세 조회
    const openDetail = useCallback(async (projectRecordNo) => {

        try {
            setDetailLoading(true);
            setDetailModalOpen(true);

            const { data } = await apiClient.get(`/record/${projectRecordNo}`);

            setSelectedRecord(data);
        }
        catch (e) {
            console.error(e);
            toast.error("record 정보를 불러오지 못했습니다");

            setDetailModalOpen(false);
        }
        finally {
            setDetailLoading(false);
        }
    }, []);

    //수정 모달 열기
    const openEditModal = useCallback(() => {
        if (!selectedRecord) return;

        setEditRecordNo(selectedRecord.projectRecordNo);

        setRecordType(selectedRecord.projectRecordType);
        setRecordTitle(selectedRecord.projectRecordTitle);
        setRecordContent(selectedRecord.projectRecordContent);

        //메세지는 record 수정 화면에서 x
        const editableRelatedList =
            (selectedRecord.relatedList || []).filter(
                related => related.relatedType === "TASK"
                    || related.relatedType === "NOTE"
                    || related.relatedType === "ATTACH"
            );

        setSelectedRelatedList(editableRelatedList);

        setRelatedSelectModalOpen(false);
        setRelatedSelectType(null);
        setRelatedKeyword("");

        loadRelatedSource();

        setDetailModalOpen(false);
        setEditModalOpen(true);

    }, [selectedRecord]);

    // 수정
    const editRecord = useCallback(async () => {

        if (recordTitle.trim().length === 0) {
            toast.warning("제목을 입력해주세요");
            return;
        }
        if (recordContent.trim().length === 0) {
            toast.warning("내용을 입력해주세요");
            return;
        }

        //선택된 원본 데이터를 타입별 번호 목록으로 변환
        const taskNoList = selectedRelatedList
            .filter(item => item.relatedType === "TASK")
            .map(item => item.relatedNo);
        const noteNoList = selectedRelatedList
            .filter(item => item.relatedType === "NOTE")
            .map(item => item.relatedNo);
        const attachNoList = selectedRelatedList
            .filter(item => item.relatedType === "ATTACH")
            .map(item => item.relatedNo);

        try {
            await apiClient.put(
                `/record/${editRecordNo}`,
                {
                    projectRecordTitle: recordTitle,
                    projectRecordContent: recordContent,
                    taskNoList: taskNoList,
                    noteNoList: noteNoList,
                    attachNoList: attachNoList
                }
            );

            toast.success("기록이 수정되었습니다");

            setEditModalOpen(false);

            await refreshRecordData();
            await openDetail(editRecordNo);

            setEditRecordNo(null);
        }
        catch (e) {
            console.error(e);
            toast.error("record 수정에 실패했습니다");
        }

    }, [editRecordNo, recordTitle, recordContent, selectedRelatedList]);

    //record 삭제
    const deleteRecord = useCallback(async () => {

        if (!selectedRecord) return;

        const result = await Swal.fire({
            title: "기록을 삭제하시겠습니까?",
            text: "삭제한 기록은 복구할 수 없습니다",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "삭제",
            cancelButtonText: "취소"
        });

        if (!result.isConfirmed) return;

        try {
            await apiClient.delete(`/record/${selectedRecord.projectRecordNo}`);

            toast.success("기록이 삭제되었습니다");

            setDetailModalOpen(false);
            setSelectedRecord(null);

            await refreshRecordData();
        }
        catch (e) {
            console.error(e);
            toast.error("기록 삭제에 실패했습니다");
        }
    }, [selectedRecord]);

    // 이슈 해결 모달 열기
    const openResolveModal = useCallback(() => {
        setIssueResolution("");
        setResolveModalOpen(true);
    }, []);

    // 이슈 해결 처리
    const resolveIssue = useCallback(async () => {

        if (!selectedRecord) return;

        if (issueResolution.trim().length === 0) {
            toast.warning("해결 내용을 입력해주세요");
            return;
        }

        try {
            await apiClient.put(
                `/record/${selectedRecord.projectRecordNo}/resolve`,
                {
                    projectRecordIssueResolution: issueResolution
                }
            );

            toast.success("이슈가 해결 처리되었습니다");

            //해결 모달 닫기
            setResolveModalOpen(false);
            setIssueResolution("");

            //목록 최신화
            await refreshRecordData();

            //상세 최신화(열려 있었지만 최신으로 다시 열려고)
            await openDetail(selectedRecord.projectRecordNo);
        }
        catch (e) {
            console.error(e);
            toast.error("이슈 해결 처리에 실패했습니다");
        }

    }, [selectedRecord, issueResolution]);

    //이슈 다시 열기
    const reopenIssue = useCallback(async () => {

        if (!selectedRecord) return;

        const result = await Swal.fire({
            title: "이슈를 다시 여시겠습니까?",
            text: "기존 해결 내용과 해결 시간이 초기화됩니다",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "다시 열기",
            cancelButtonText: "취소"
        });

        if (!result.isConfirmed) return;

        try {
            await apiClient.put(`/record/${selectedRecord.projectRecordNo}/reopen`);

            toast.success("이슈가 다시 열렸습니다");

            await refreshRecordData();
            await openDetail(selectedRecord.projectRecordNo);
        }
        catch (e) {
            console.error(e);
            toast.error("이슈 다시 열기에 실패했습니다")
        }
    }, [selectedRecord]);

    //record 타입 필터 변경
    const changeTypeFilter = useCallback((type) => {

        setSearchCondition(prev => ({
            ...prev,
            type: type,

            //ISSUE가 아닌 타입을 직접 선택했다면
            //ISSUE 상태 필터는 해제
            issueStatus:
                type === "ISSUE"
                    ? prev.issueStatus
                    : "ALL"
        }));

        if (type !== "ISSUE") {
            setFilterCondition(prev => ({
                ...prev,
                issueStatus: "ALL"
            }));
        }
    }, []);

    //정렬 변경
    const changeSort = useCallback((e) => {
        const sort = e.target.value;

        setSearchCondition(prev => ({
            ...prev,
            sort: sort
        }));

    }, []);

    //record 검색
    const searchRecord = useCallback((e) => {
        e.preventDefault();

        setSearchCondition(prev => ({
            ...prev,
            keyword: searchKeyword.trim()
        }));
    }, [searchKeyword]);

    const typeFilterList = [
        {
            value: "ALL",
            name: "전체",
            count: recordSummary.totalCount
        },
        {
            value: "DECISION",
            name: "의사결정",
            count: recordSummary.decisionCount
        },
        {
            value: "ISSUE",
            name: "이슈",
            count: recordSummary.issueCount
        },
        {
            value: "DELIVERABLE",
            name: "산출물",
            count: recordSummary.deliverableCount
        },
        {
            value: "ETC",
            name: "기타",
            count: recordSummary.etcCount
        }
    ];

    //타입 한글 변환
    const getTypeName = (type) => {
        switch (type) {
            case "DECISION":
                return "의사결정";
            case "ISSUE":
                return "이슈";
            case "DELIVERABLE":
                return "산출물";
            case "ETC":
                return "기타";
            default:
                return type;

        }
    };

    // 타입 badge 색상
    const getTypeVariant = (type) => {
        switch (type) {
            case "DECISION":
                return "primary";
            case "ISSUE":
                return "danger";
            case "DELIVERABLE":
                return "success";
            case "ETC":
                return "secondary";
            default:
                return "secondary";
        }
    };

    //날짜 표시
    const formatRecordDateTime = (value) => {
        if (!value) return "-";

        return String(value)
            .replace("T", " ")
            .slice(0, 16);
    }

    // 원본 데이터 type 변환
    const getRelatedTypeName = (type) => {
        switch (type) {
            case "TASK":
                return "업무";
            case "MESSAGE":
                return "채팅";
            case "NOTE":
                return "노트";
            case "ATTACH":
                return "파일";
            default:
                return type;
        }
    }

    //Record 관련 원본으로 이동
    const moveToRelatedSource = useCallback((related) => {
        if(!related) return;

        switch(related.relatedType) {
            case "TASK":
                navigate(`/projects/${projectNo}/task?taskNo=${related.relatedNo}`);
                break;

            case "NOTE":
                navigate(`/projects/${projectNo}/note/${related.relatedNo}`)
                break;

            case "ATTACH":
                navigate(`/projects/${projectNo}/files`);
                break;

            case "MESSAGE":
                navigate(`/projects/${projectNo}/chat?messageNo=${related.relatedNo}`);
                break;

            default:
                return;
        }
    }, []);

    // 원본 데이터 목록을 공통 형태로 변환
    const getRelatedOptionList = () => {

        if (!relatedSelectType) return [];

        const sourceList = relatedSource[relatedSelectType] || [];

        switch (relatedSelectType) {
            case "TASK":
                return sourceList.map(task => ({
                    relatedType: "TASK",
                    relatedNo: task.taskNo,
                    relatedTitle: task.taskTitle,
                    relatedStatus: task.taskStatus
                }));
            case "NOTE":
                return sourceList.map(note => ({
                    relatedType: "NOTE",
                    relatedNo: note.noteNo,
                    relatedTitle: note.noteTitle,
                    relatedStatus: null
                }));
            case "ATTACH":
                return sourceList.map(file => ({
                    relatedType: "ATTACH",
                    relatedNo: file.attachNo,
                    relatedTitle: file.attachName,
                    relatedStatus: null
                }));
            default:
                return [];
        }
    };


    //검색된 원본 데이터 리스트
    const relatedOptionList = getRelatedOptionList();
    const filteredRelatedOptionList =
        relatedOptionList.filter(item =>
            item.relatedTitle
                ?.toLowerCase()
                .includes(relatedKeyword.toLowerCase())
        );

    //원본 데이터 선택 여부 확인
    const isRelatedSelected = useCallback((item) => {
        return selectedRelatedList.some(
            selected =>
                selected.relatedType === item.relatedType
                && selected.relatedNo === item.relatedNo
        )
    }, [selectedRelatedList]);

    //원본 데이터 선택/해제 함수
    const toggleRelated = useCallback((item) => {
        setSelectedRelatedList(prev => {
            //지금 선택한게 선택되어 있나?
            const exists = prev.some(
                selected =>
                    selected.relatedType === item.relatedType
                    && selected.relatedNo === item.relatedNo
            );
            //선택되어 있다면 빼라
            if (exists) {
                return prev.filter(
                    selected =>
                        !(
                            selected.relatedType === item.relatedType
                            && selected.relatedNo === item.relatedNo
                        )
                );
            }
            //선택되어 있지 않았다면 넣어라
            return [...prev, item];
        })
    }, []);

    //선택된 원본 데이터 제거
    const removeRelated = useCallback((target) => {
        setSelectedRelatedList(prev =>
            prev.filter(
                item =>
                    !(
                        item.relatedType === target.relatedType
                        && item.relatedNo === target.relatedNo
                    )
            )
        );
    }, []);

    //상세 필터 적용
    const applyFilter = useCallback(() => {

        //기간 검증
        if (
            filterCondition.startDate
            && filterCondition.endDate
            && filterCondition.startDate > filterCondition.endDate
        ) {
            toast.warning("시작일은 종료일보다 늦을 수 없습니다");
            return;
        }

        setSearchCondition(prev => ({
            ...prev,

            issueStatus: filterCondition.issueStatus,
            relatedType: filterCondition.relatedType,

            writerNo:
                filterCondition.writerNo === ""
                    ? null
                    : Number(filterCondition.writerNo),

            startDate: filterCondition.startDate || null,
            endDate: filterCondition.endDate || null
        }));

        setFilterOpen(false);
    }, [filterCondition])

    //상세 필터 초기화
    const resetFilter = useCallback(() => {
        setFilterCondition({
            issueStatus: "ALL",
            relatedType: "ALL",
            writerNo: "",
            startDate: "",
            endDate: ""
        });

        setSearchCondition(prev => ({
            ...prev,
            type: "ALL",
            issueStatus: "ALL",
            relatedType: "ALL",
            writerNo: null,
            startDate: null,
            endDate: null
        }));

        setFilterOpen(false);
    }, []);

    //적용된 상세 필터 개수
    const appliedFilterCount =
        (searchCondition.issueStatus !== "ALL" ? 1 : 0)
        + (searchCondition.relatedType !== "ALL" ? 1 : 0)
        + (searchCondition.writerNo !== null ? 1 : 0)
        + (
            searchCondition.startDate != null
                || searchCondition.endDate !== null
                ? 1
                : 0
        );


    return (<>
        <div className="records-page">
            {/* 상단 */}
            <div className="records-header">
                <div>
                    <h2 className="records-title">
                        프로젝트 기록
                    </h2>

                    <div className="records-subtitle">
                        프로젝트의 중요한 결정, 이슈와 산출물을 기록합니다.
                    </div>
                </div>

                {!isClosed && (
                    <Button variant="primary" onClick={openAddModal}>
                        <Plus size={16} className="me-1" />
                        새 기록 작성
                    </Button>
                )}
            </div>

            <div className="records-main-layout">

                {/* 왼쪽 : 조회 + 목록 */}
                <div className="records-main-content">
                    {/* 조회 도구 */}
                    <div className="records-toolbar">

                        {/* 타입 필터 */}
                        <div className="records-type-filter">
                            {typeFilterList.map(item => (
                                <button
                                    type="button"
                                    key={item.value}
                                    className={
                                        searchCondition.type === item.value
                                            ? "records-type-filter-button active"
                                            : "records-type-filter-button"
                                    }
                                    onClick={() => changeTypeFilter(item.value)}
                                >
                                    <span>
                                        {item.name}
                                    </span>

                                    <span className="records-type-count">
                                        {item.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="records-toolbar-actions">

                            {/* 검색 */}
                            <form
                                className="records-search"
                                onSubmit={searchRecord}
                            >
                                <div className="records-search-input">
                                    <Search size={16} />

                                    <Form.Control
                                        type="text"
                                        value={searchKeyword}
                                        onChange={e => setSearchKeyword(e.target.value)}
                                        placeholder="기록 검색"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    variant="outline-secondary"
                                >
                                    검색
                                </Button>
                            </form>

                            {/* 상세 필터 */}
                            <div className="records-filter-wrapper" ref={filterWrapperRef}>
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    className={
                                        appliedFilterCount > 0
                                            ? "records-filter-button active"
                                            : "records-filter-button"
                                    }
                                    onClick={() => setFilterOpen(prev => !prev)}
                                >
                                    <SlidersHorizontal size={16} />
                                    필터

                                    {appliedFilterCount > 0 && (
                                        <span className="records-filter-count">
                                            {appliedFilterCount}
                                        </span>
                                    )}
                                </Button>

                                {filterOpen && (
                                    <div className="records-filter-panel">
                                        <div className="records-filter-panel-title">
                                            상세 필터
                                        </div>

                                        <Form.Group className="records-filter-group">
                                            <Form.Label>
                                                이슈 상태
                                            </Form.Label>

                                            <Form.Select
                                                value={filterCondition.issueStatus}
                                                onChange={e =>
                                                    setFilterCondition(prev => ({
                                                        ...prev,
                                                        issueStatus: e.target.value
                                                    }))
                                                }
                                            >
                                                <option value="ALL">
                                                    전체
                                                </option>
                                                <option value="OPEN">
                                                    진행중
                                                </option>
                                                <option value="RESOLVED">
                                                    해결
                                                </option>
                                            </Form.Select>
                                        </Form.Group>

                                        <Form.Group className="records-filter-group">
                                            <Form.Label>
                                                관련 원본
                                            </Form.Label>

                                            <Form.Select
                                                value={filterCondition.relatedType}
                                                onChange={e =>
                                                    setFilterCondition(prev => ({
                                                        ...prev,
                                                        relatedType: e.target.value
                                                    }))
                                                }
                                            >
                                                <option value="ALL">
                                                    전체
                                                </option>
                                                <option value="TASK">
                                                    업무
                                                </option>
                                                <option value="MESSAGE">
                                                    채팅
                                                </option>
                                                <option value="NOTE">
                                                    노트
                                                </option>
                                                <option value="ATTACH">
                                                    파일
                                                </option>
                                            </Form.Select>
                                        </Form.Group>

                                        <Form.Group className="records-filter-group">
                                            <Form.Label>
                                                작성자
                                            </Form.Label>

                                            <Form.Select
                                                value={filterCondition.writerNo}
                                                onChange={e =>
                                                    setFilterCondition(prev => ({
                                                        ...prev,
                                                        writerNo: e.target.value
                                                    }))
                                                }
                                            >
                                                <option value="">
                                                    전체
                                                </option>

                                                {memberList.map(member => (
                                                    <option
                                                        key={member.projectMemberNo}
                                                        value={member.projectMemberNo}
                                                    >
                                                        {member.empName}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>

                                        <div className="records-filter-date">
                                            <Form.Group>
                                                <Form.Label>
                                                    시작일
                                                </Form.Label>

                                                <Form.Control
                                                    type="date"
                                                    value={filterCondition.startDate}
                                                    onChange={e =>
                                                        setFilterCondition(prev => ({
                                                            ...prev,
                                                            startDate: e.target.value
                                                        }))
                                                    }
                                                />
                                            </Form.Group>

                                            <Form.Group>
                                                <Form.Label>
                                                    종료일
                                                </Form.Label>

                                                <Form.Control
                                                    type="date"
                                                    value={filterCondition.endDate}
                                                    onChange={e =>
                                                        setFilterCondition(prev => ({
                                                            ...prev,
                                                            endDate: e.target.value
                                                        }))
                                                    }
                                                />
                                            </Form.Group>

                                        </div>

                                        <div className="records-filter-footer">
                                            <Button
                                                type="button"
                                                variant="light"
                                                onClick={resetFilter}
                                            >
                                                초기화
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="primary"
                                                onClick={applyFilter}
                                            >
                                                적용
                                            </Button>
                                        </div>

                                    </div>
                                )}
                            </div>

                            {/* 정렬 */}
                            <div className="records-sort">
                                <ArrowUpDown size={16} />

                                <Form.Select
                                    value={searchCondition.sort}
                                    onChange={changeSort}
                                >
                                    <option value="LATEST">
                                        최신 작성순
                                    </option>

                                    <option value="OLDEST">
                                        오래된 작성순
                                    </option>

                                    <option value="UPDATED">
                                        최근 수정순
                                    </option>
                                </Form.Select>
                            </div>
                        </div>

                    </div>

                    {/* 목록 */}
                    {loading === true ? (
                        <div className="records-empty">
                            기록을 불러오는 중입니다.
                        </div>
                    ) : recordList.length === 0 ? (
                        <div className="records-empty">
                            조건에 맞는 기록이 없습니다
                        </div>
                    ) : (<>
                        <div className="record-list">
                            {recordList.map(record => {
                                const relatedList = record.relatedList || [];

                                const extraRelatedCount = Math.max(
                                    (record.relatedCount || 0) - relatedList.length,
                                    0
                                );

                                return (
                                    <div
                                        className="record-card"
                                        key={record.projectRecordNo}
                                        onClick={() => openDetail(record.projectRecordNo)}
                                    >
                                        {/* 상단 */}
                                        <div className="record-card-top">

                                            <div className="record-card-badges">
                                                <Badge
                                                    bg={getTypeVariant(record.projectRecordType)}
                                                >
                                                    {getTypeName(record.projectRecordType)}
                                                </Badge>

                                                {record.projectRecordType === "ISSUE" && (
                                                    <Badge
                                                        bg={record.projectRecordIssueStatus === "RESOLVED"
                                                            ? "success" : "warning"
                                                        }
                                                        text={record.projectRecordIssueStatus === "OPEN"
                                                            ? "dark" : undefined
                                                        }
                                                    >
                                                        {record.projectRecordIssueStatus === "RESOLVED"
                                                            ? "해결" : "진행중"}
                                                    </Badge>
                                                )}

                                            </div>

                                            <div className="record-card-date">
                                                {formatRecordDateTime(record.projectRecordCtime)}
                                            </div>

                                        </div>

                                        {/* 제목 */}
                                        <div className="record-card-title">
                                            {record.projectRecordTitle}
                                        </div>

                                        {/* 내용 미리보기 */}
                                        {record.projectRecordContentPreview && (
                                            <div className="record-card-content">
                                                {record.projectRecordContentPreview}
                                            </div>
                                        )}

                                        {/* 해결된 ISSUE */}
                                        {record.projectRecordType === "ISSUE"
                                            && record.projectRecordIssueStatus === "RESOLVED"
                                            && record.projectRecordIssueResolutionPreview
                                            && (
                                                <div className="record-card-resolution">
                                                    <span className="record-card-resolution-label">
                                                        해결
                                                    </span>

                                                    <span className="record-card-resolution-content">
                                                        {record.projectRecordIssueResolutionPreview}
                                                    </span>
                                                </div>
                                            )
                                        }

                                        {/* 작성 / 수정 정보 */}

                                        <div className="record-card-info">
                                            <span>
                                                <User size={13} />
                                                작성자 {record.projectRecordWriterName}
                                            </span>

                                            {record.projectRecordUtime
                                                && record.projectRecordModifierName
                                                && (
                                                    <span>
                                                        수정자 {record.projectRecordModifierName}
                                                        {" . "}
                                                        {formatRecordDateTime(record.projectRecordUtime)}
                                                    </span>
                                                )
                                            }
                                    
                                        </div>

                                        {/* 관련 원본 */}
                                        {record.relatedCount > 0 && (
                                            <div className="record-card-related">
                                                <span className="record-card-related-label">
                                                    관련
                                                </span>

                                                <div className="record-card-related-list">
                                                    {relatedList.map(related => (
                                                        <div
                                                            key={`${related.relatedType}-${related.relatedNo}`}
                                                            className="record-card-related-item"
                                                        >
                                                            <span className="record-card-related-type">
                                                                {getRelatedTypeName(related.relatedType)}
                                                            </span>

                                                            <span className="record-card-related-title">
                                                                {related.relatedTitle}
                                                            </span>
                                                        </div>
                                                    ))}

                                                    {extraRelatedCount > 0 && (
                                                        <span className="record-card-related-more">
                                                            +{extraRelatedCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {!last && (
                            <div className="records-load-more">
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    onClick={loadMoreRecord}
                                    disabled={moreLoading}
                                >
                                    {moreLoading
                                        ? "기록을 불러오는 중..."
                                        : "기록 더보기"
                                    }
                                </Button>
                            </div>
                        )}
                    </>)}
                </div>

                {/* 오른쪽 : Summary */}
                <div className="records-summary-panel">

                    <div className="records-summary-header">
                        <div className="records-summary-icon">
                            <FileText size={21} />
                        </div>

                        <div>
                            <div className="records-summary-title">
                                프로젝트 기록
                            </div>

                            <div className="records-summary-description">
                                주요 결정과 이슈, 산출물의 흐름을 확인합니다
                            </div>
                        </div>
                    </div>

                    {/* 전체 기록 수 */}
                    <div className="records-summary-total">
                        <span>
                            전체 기록
                        </span>

                        <strong>
                            {recordSummary.totalCount}
                            <small>개</small>
                        </strong>
                    </div>

                    {/* 유형별 현황 */}
                    <div className="records-summary-section">
                        <div className="records-summary-section-title">
                            기록 현황
                        </div>

                        <div className="records-summary-start-list">
                            <div className="records-summary-stat">
                                <span>의사결정</span>
                                <strong>{recordSummary.decisionCount}</strong>
                            </div>
                            
                            <div className="records-summary-stat">
                                <span>이슈</span>
                                <strong>{recordSummary.issueCount}</strong>
                            </div>

                            <div className="records-summary-stat">
                                <span>산출물</span>
                                <strong>{recordSummary.deliverableCount}</strong>
                            </div>
                            
                            <div className="records-summary-stat">
                                <span>기타</span>
                                <strong>{recordSummary.etcCount}</strong>
                            </div>

                        </div>
                    </div>

                    {/* ISSUE 현황 */}
                    <div className="records-summary-section">
                        <div className="records-summary-section-title">
                            이슈 현황
                        </div>

                        <div className="records-summary-issue-list">
                            <div className="records-summary-issue open">
                                <AlertCircle size={16} />

                                <span>
                                    진행중
                                </span>

                                <strong>
                                    {recordSummary.openIssueCount}
                                </strong>
                            </div>

                            <div className="records-summary-issue resolved">
                                <CheckCircle2 size={16} />

                                <span>
                                    해결
                                </span>

                                <strong>
                                    {recordSummary.resolvedIssueCount}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* 최근 기록 */}
                    <div className="records-summary-section">
                        <div className="records-summary-section-title">
                            최근 기록
                        </div>

                        {recordSummary.latestRecordNo ? (
                            <button
                                type="botton"
                                className="records-summary-latest"
                                onClick={() => openDetail(recordSummary.latestRecordNo)}
                            >
                                <span className="records-summary-latest-title">
                                    {recordSummary.latestRecordTitle}
                                </span>

                                <span className="records-summary-latest-date">
                                    {formatRecordDateTime(recordSummary.latestRecordAt)}
                                </span>
                            </button>
                        ) : (
                            <div className="records-summary-none">
                                아직 등록된 기록이 없습니다
                            </div>
                        )}
                    </div>

                    <div className="records-summary-guide">
                        Record는 프로젝트의 주요 결정, 이슈와 산출물을
                        관련 업무·채팅·노트·파일과 함께 보존합니다
                    </div>

                </div>

            </div>


            {/* 등록 모달 */}
            <Modal
                show={addModalOpen}
                onHide={() => setAddModalOpen(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        새 프로젝트 기록
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <FormGroup className="mb-3">
                        <Form.Label>
                            기록 유형
                        </Form.Label>

                        <Form.Select
                            value={recordType}
                            onChange={e => setRecordType(e.target.value)}
                        >
                            <option value="">
                                선택하세요
                            </option>
                            <option value="DECISION">
                                의사결정
                            </option>
                            <option value="ISSUE">
                                이슈
                            </option>
                            <option value="DELIVERABLE">
                                산출물
                            </option>
                            <option value="ETC">
                                기타
                            </option>
                        </Form.Select>
                    </FormGroup>

                    <FormGroup className="mb-3">
                        <FormLabel>
                            제목
                        </FormLabel>

                        <Form.Control
                            type="text"
                            maxLength={300}
                            value={recordTitle}
                            onChange={e => setRecordTitle(e.target.value)}
                            placeholder="기록 제목을 입력하세요"
                        />
                    </FormGroup>

                    <FormGroup>
                        <FormLabel>
                            내용
                        </FormLabel>

                        <Form.Control
                            as="textarea"
                            rows={6}
                            value={recordContent}
                            onChange={e => setRecordContent(e.target.value)}
                            placeholder="기록할 내용을 입력하세요"
                        />
                    </FormGroup>

                    {/* 원본 데이터 */}
                    <FormGroup className="mt-4">
                        <FormLabel>
                            원본 데이터
                            <span className="text-muted ms-2">
                                (선택)
                            </span>
                        </FormLabel>

                        <div className="record-related-buttons">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => openRelatedSelectModal("TASK")}
                            >
                                + 업무
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => openRelatedSelectModal("NOTE")}
                            >
                                + 노트
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => openRelatedSelectModal("ATTACH")}
                            >
                                + 파일
                            </Button>
                        </div>

                        {/* 선택된 관련 항목 */}
                        {selectedRelatedList.length > 0 && (
                            <div className="record-selected-related-list">
                                {selectedRelatedList.map(related => (
                                    <div
                                        className="record-selected-related-item"
                                        key={`${related.relatedType}-${related.relatedNo}`}
                                    >
                                        <Badge bg="light" text="dark">
                                            {getRelatedTypeName(related.relatedType)}
                                        </Badge>

                                        <span className="record-selected-related-title">
                                            {related.relatedTitle}
                                        </span>

                                        <Button
                                            variant="link"
                                            className="record-selected-related-remove"
                                            onClick={() => removeRelated(related)}
                                        >
                                            ×
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FormGroup>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary"
                        onClick={() => { setAddModalOpen(false) }}>
                        취소
                    </Button>

                    <Button variant="primary"
                        onClick={addRecord}>
                        등록
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 원본 데이터 선택 모달 */}
            <Modal
                show={relatedSelectModalOpen}
                onHide={() => setRelatedSelectModalOpen(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        원본 {getRelatedTypeName(relatedSelectType)} 선택
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    {/* 검색 */}
                    <Form.Control
                        type="text"
                        value={relatedKeyword}
                        onChange={e => setRelatedKeyword(e.target.value)}
                        placeholder={`${getRelatedTypeName(relatedSelectType)} 검색`}
                        className="mb-3"
                    />

                    {relatedLoading === true ? (
                        <div className="records-empty">
                            관련 항목을 불러오는 중입니다
                        </div>
                    ) : filteredRelatedOptionList.length === 0 ? (
                        <div className="records-empty">
                            표시할 항목이 없습니다
                        </div>
                    ) : (
                        <div className="record-related-select-list">
                            {filteredRelatedOptionList.map(item => {
                                const selected = isRelatedSelected(item);

                                return (
                                    <div
                                        key={`${item.relatedType}-${item.relatedNo}`}
                                        className={
                                            selected
                                                ? "record-related-select-item selected"
                                                : "record-related-select-item"
                                        }
                                        onClick={() => toggleRelated(item)}
                                    >
                                        <Form.Check
                                            type="checkbox"
                                            checked={selected}
                                            readOnly
                                        />

                                        <div className="record-related-select-content">
                                            <div className="record-related-select-title">
                                                {item.relatedTitle}
                                            </div>

                                            {item.relatedStatus && (
                                                <div className="record-related-select-info">
                                                    {item.relatedStatus}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="primary"
                        onClick={() => setRelatedSelectModalOpen(false)}
                    >
                        선택 완료
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 상세 모달 */}
            <Modal
                show={detailModalOpen}
                onHide={() => {
                    setDetailModalOpen(false);
                    setSelectedRecord(null);
                }}
                centered
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        기록 상세
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    {detailLoading === true ? (
                        <div className="records-empty">
                            기록을 불러오는 중입니다.
                        </div>
                    ) : selectedRecord && (
                        <div className="record-detail">
                            <div className="record-detail-badges">
                                <Badge
                                    bg={getTypeVariant(selectedRecord.projectRecordType)}
                                >
                                    {getTypeName(selectedRecord.projectRecordType)}
                                </Badge>

                                {selectedRecord.projectRecordType === "ISSUE" && (
                                    <Badge
                                        bg={selectedRecord.projectRecordIssueStatus === "RESOLVED"
                                            ? "success" : "warning"
                                        }
                                        text={selectedRecord.projectRecordIssueStatus === "OPEN"
                                            ? "dark" : undefined
                                        }
                                    >
                                        {selectedRecord.projectRecordIssueStatus === "RESOLVED"
                                            ? "해결" : "진행중"}
                                    </Badge>
                                )}
                            </div>

                            <h4 className="record-detail-title">
                                {selectedRecord.projectRecordTitle}
                            </h4>

                            <div className="record-detail-meta">

                                <div className="record-detail-meta-item">
                                    <span className="record-detail-meta-label">
                                        작성자
                                    </span>

                                    <span>
                                        {selectedRecord.projectRecordWriterName}
                                    </span>
                                </div>
                                
                                <div className="record-detail-meta-item">
                                    <span className="record-detail-meta-label">
                                        작성일
                                    </span>

                                    <span>
                                        {formatRecordDateTime(selectedRecord.projectRecordCtime)}
                                    </span>
                                </div>

                                {selectedRecord.projectRecordModifierName && (
                                    <div className="record-detail-meta-item">
                                        <span className="record-detail-meta-label">
                                            수정자
                                        </span>

                                        <span>
                                            {selectedRecord.projectRecordModifierName}
                                        </span>
                                    </div>
                                )}

                                {selectedRecord.projectRecordUtime && (
                                    <div className="record-detail-meta-item">
                                        <span className="record-detail-meta-label">
                                            수정일
                                        </span>

                                        <span>
                                            {formatRecordDateTime(selectedRecord.projectRecordUtime)}
                                        </span>
                                    </div>
                                )}
                                
                            </div>

                            <div className="record-detail-section">
                                <div className="record-detail-section-title">
                                    기록 내용
                                </div>
                            
                                <div className="record-detail-content">
                                    {selectedRecord.projectRecordContent}
                                </div>
                            </div>


                            {/* 연결된 원본 영역 */}
                            {selectedRecord.relatedList &&
                                selectedRecord.relatedList.length > 0 && (
                                    <div className="record-related">
                                        <div className="record-related-title">
                                            관련원본
                                            <span className="record-related-count">
                                                {selectedRecord.relatedList.length}
                                            </span>
                                        </div>

                                        <div className="record-related-list">
                                            {selectedRecord.relatedList.map((related) => (
                                                <button
                                                    type="button"
                                                    className="record-related-item"
                                                    key={`${related.relatedType}-${related.relatedNo}`}
                                                    onClick={() => moveToRelatedSource(related)}
                                                >
                                                    <Badge bg="light" text="dark">
                                                        {getRelatedTypeName(related.relatedType)}
                                                    </Badge>

                                                    <span className="record-related-item-title">
                                                        {related.relatedTitle}
                                                    </span>

                                                    {related.relatedStatus && (
                                                        <span className="record-related-status">
                                                            {related.relatedStatus}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {selectedRecord.projectRecordType === "ISSUE"
                                && selectedRecord.projectRecordIssueStatus === "RESOLVED"
                                && (
                                    <div className="record-issue-resolution">

                                        <div className="record-resolution-header">
                                            <div className="record-resolution-title">
                                                해결 내용
                                            </div>

                                            <div className="record-resolution-date">
                                                {formatRecordDateTime(
                                                    selectedRecord.projectRecordIssueResolvedAt
                                                )}
                                            </div>
                                        </div>

                                        <div className="record-resolution-content">
                                            {selectedRecord.projectRecordIssueResolution}
                                        </div>

                                    </div>
                                )
                            }
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer className="record-detail-footer">
                    <div>
                        {canChangeRecord && (
                            <Button
                                variant="danger"
                                onClick={deleteRecord}
                            >
                                삭제
                            </Button>
                        )}
                    </div>

                    <div className="record-detail-footer-actions">

                        {canChangeRecord
                            && selectedRecord?.projectRecordType === "ISSUE"
                            && selectedRecord?.projectRecordIssueStatus === "OPEN"
                            && (
                                <Button
                                    variant="success"
                                    onClick={openResolveModal}
                                >
                                    해결 처리
                                </Button>
                            )
                        }

                        {canChangeRecord
                            && selectedRecord?.projectRecordType === "ISSUE"
                            && selectedRecord?.projectRecordIssueStatus === "RESOLVED"
                            && (
                                <Button
                                    variant="outline-warning"
                                    onClick={reopenIssue}
                                >
                                    다시 열기
                                </Button>
                            )
                        }

                        {canChangeRecord && (<>

                            <Button
                                variant="primary"
                                onClick={openEditModal}
                            >
                                수정
                            </Button>
                        </>)}

                        <Button
                            variant="secondary"
                            onClick={() => {
                                setDetailModalOpen(false);
                                setSelectedRecord(null);
                            }}
                        >
                            닫기
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* 수정 모달 */}
            <Modal
                show={editModalOpen}
                onHide={() => setEditModalOpen(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        프로젝트 기록 수정
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <FormGroup className="mb-3">
                        <FormLabel>
                            기록 유형
                        </FormLabel>

                        <Form.Select
                            value={recordType}
                            disabled
                        >
                            <option value={"DECISION"}>
                                의사결정
                            </option>
                            <option value={"ISSUE"}>
                                이슈
                            </option>
                            <option value={"DELIVERABLE"}>
                                산출물
                            </option>
                            <option value={"ETC"}>
                                기타
                            </option>
                        </Form.Select>
                    </FormGroup>

                    <FormGroup className="mb-3">
                        <FormLabel>
                            제목
                        </FormLabel>

                        <Form.Control
                            type="text"
                            maxLength={300}
                            value={recordTitle}
                            onChange={e => setRecordTitle(e.target.value)}
                        />
                    </FormGroup>

                    <FormGroup>
                        <FormLabel>
                            내용
                        </FormLabel>

                        <Form.Control
                            as="textarea"
                            rows={6}
                            value={recordContent}
                            onChange={e => setRecordContent(e.target.value)}
                        />
                    </FormGroup>

                    <FormGroup className="mt-4">
                        <FormLabel>
                            원본 데이터
                            <span className="text-muted ms-2">
                                (선택)
                            </span>
                        </FormLabel>

                        <div className="record-related-buttons">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => openRelatedSelectModal("TASK")}
                            >
                                + 업무
                            </Button>

                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => openRelatedSelectModal("NOTE")}
                            >
                                + 노트
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => openRelatedSelectModal("ATTACH")}
                            >
                                + 파일
                            </Button>
                        </div>

                        {selectedRelatedList.length > 0 && (
                            <div className="record-selected-related-list">
                                {selectedRelatedList.map(related => (
                                    <div
                                        className="record-selected-related-item"
                                        key={`${related.relatedType}-${related.relatedNo}`}
                                    >
                                        <Badge bg="light" text="dark">
                                            {getRelatedTypeName(related.relatedType)}
                                        </Badge>

                                        <span className="record-selected-related-title">
                                            {related.relatedTitle}
                                        </span>

                                        <Button
                                            variant="link"
                                            className="record-selected-related-remove"
                                            onClick={() => removeRelated(related)}
                                        >
                                            ×
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                    </FormGroup>

                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setEditModalOpen(false);
                            setDetailModalOpen(true);
                            setEditRecordNo(null);
                        }}
                    >
                        취소
                    </Button>

                    <Button
                        variant="primary"
                        onClick={editRecord}
                    >
                        수정
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 이슈 해결 모달 */}
            <Modal
                show={resolveModalOpen}
                onHide={() => setResolveModalOpen(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        이슈 해결
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <FormGroup>
                        <FormLabel>
                            해결 내용
                        </FormLabel>

                        <Form.Control
                            as="textarea"
                            rows={5}
                            value={issueResolution}
                            onChange={e => setIssueResolution(e.target.value)}
                            placeholder="이슈를 어떻게 해결했는지 입력하세요"
                        />
                    </FormGroup>
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setResolveModalOpen(false)}
                    >
                        취소
                    </Button>

                    <Button
                        variant="success"
                        onClick={resolveIssue}
                    >
                        해결 완료
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    </>)
}