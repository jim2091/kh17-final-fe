import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Button, Modal, Form, Badge, FormGroup, FormLabel } from "react-bootstrap";
import { Plus, Calendar, User } from "lucide-react";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";
import "./Records.css";
import Swal from "sweetalert2";

export default function Records() {

    const {projectNo} = useParams();
    const {project} = useOutletContext();

    //목록
    const [recordList, setRecordList] = useState([]);
    const [loading, setLoading] = useState(true);

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
    const isRecordWritter = 
        project?.projectMemberNo === selectedRecord?.projectRecordWriterNo;

    const isManagerOrOwner = 
        project?.projectMemberRole === "owner"
        || project?.projectMemberRole === "manager";

    const canManageRecord = isRecordWritter || isManagerOrOwner;

    //목록 조회
    const loadRecordList = useCallback(async () => {
        try {
            setLoading(true);

            const {data} = await apiClient.get(`/record/project/${projectNo}`);

            setRecordList(data || []);
        }
        catch(e) {
            console.error(e);
            toast.error("record 목록을 불러오지 못했습니다");
        }
        finally {
            setLoading(false);
        }
    }, []);

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
        catch(e) {
            console.error(e);
            toast.error("관련 항목을 불러오지 못했습니다");
        }
        finally{
            setRelatedLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecordList();
    }, []);

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
        if(!recordType) {
            toast.warning("타입을 선택해주세요");
            return;
        }
        if(recordTitle.trim().length === 0) {
            toast.warning("제목을 입력해주세요");
            return;
        }
        if(recordContent.trim().length === 0) {
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

            await loadRecordList();
        }
        catch(e) {
            console.error(e);
            toast.error("record 등록에 실패했습니다");
        }
    }, [recordType, recordTitle, recordContent, selectedRelatedList]);

    //상세 조회
    const openDetail = useCallback(async (projectRecordNo) => {

        try {
            setDetailLoading(true);
            setDetailModalOpen(true);

            const {data} = await apiClient.get(`/record/${projectRecordNo}`);

            setSelectedRecord(data);
        }
        catch(e) {
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

        if(recordTitle.trim().length === 0) {
            toast.warning("제목을 입력해주세요");
            return;
        }
        if(recordContent.trim().length === 0) {
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

            await loadRecordList();
            await openDetail(editRecordNo);

            setEditRecordNo(null);
        }
        catch(e) {
            console.error(e);
            toast.error("record 수정에 실패했습니다");
        }

    }, [editRecordNo, recordTitle, recordContent, selectedRelatedList]);

    //record 삭제
    const deleteRecord = useCallback(async () => {

        if(!selectedRecord) return;

        const result = await Swal.fire({
            title: "기록을 삭제하시겠습니까?",
            text: "삭제한 기록은 복구할 수 없습니다",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "삭제",
            cancelButtonText: "취소"
        });

        if(!result.isConfirmed) return;

        try {
            await apiClient.delete(`/record/${selectedRecord.projectRecordNo}`);

            toast.success("기록이 삭제되었습니다");

            setDetailModalOpen(false);
            setSelectedRecord(null);

            await loadRecordList();
        }
        catch(e) {
            console.error(e);
            toast.error("기록 삭제에 실패했습니다");
        }
    }, [selectedRecord]);

    //타입 한글 변환
    const getTypeName = (type) => {
        switch(type) {
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
        switch(type) {
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

    // 원본 데이터 type 변환
    const getRelatedTypeName = (type) => {
        switch(type) {
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

    // 원본 데이터 목록을 공통 형태로 변환
    const getRelatedOptionList = () => {

        if(!relatedSelectType) return [];

        const sourceList = relatedSource[relatedSelectType] || [];

        switch(relatedSelectType) {
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
            if(exists) {
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

    return(<>
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

                <Button variant="primary" onClick={openAddModal}>
                    <Plus size={16} className="me-1" />
                    새 기록 작성
                </Button>
            </div>

            {/* 목록 */}
            {loading === true ? (
                <div className="records-empty">
                    기록을 불러오는 중입니다.
                </div>
            ) : recordList.length === 0 ? (
                <div className="records-empty">
                    아직 등록된 기록이 없습니다.
                </div>
            ) : (
                <div className="record-list">
                    {recordList.map(record => (
                        <div
                            className="record-card"
                            key={record.projectRecordNo}
                            onClick={() => openDetail(record.projectRecordNo)}
                        >
                            <div className="record-card-top">
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

                            <div className="record-card-title">
                                {record.projectRecordTitle}
                            </div>

                            <div className="record-card-info">
                                <span>
                                    <User size={13} />
                                    {record.projectRecordWriterName}
                                </span>

                                <span>
                                    <Calendar size={13} />
                                    {
                                        record.projectRecordCtime
                                            ? String(record.projectRecordCtime).slice(0, 10)
                                            : "-"
                                    }
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                        onClick={() => {setAddModalOpen(false)}}>
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
                                <span>
                                    작성자
                                    {" "}
                                    {selectedRecord.projectRecordWriterName}
                                </span>

                                <span>
                                    작성일
                                    {" "}
                                    {selectedRecord.projectRecordCtime
                                        ? String(selectedRecord.projectRecordCtime).slice(0, 16)
                                        : "-"}
                                </span>

                                {selectedRecord.projectRecordUtime && (
                                    <span>
                                        수정일
                                        {" "}
                                        {String(selectedRecord.projectRecordUtime).slice(0, 16)}
                                    </span>
                                )}
                            </div>

                            <div className="record-detail-content">
                                {selectedRecord.projectRecordContent}
                            </div>

                            {/* 연결된 원본 영역 */}
                            {selectedRecord.relatedList &&
                                selectedRecord.relatedList.length > 0 && (
                                    <div className="record-related">
                                        <div className="record-related-title">
                                            원본 데이터
                                        </div>

                                        <div className="record-related-list">
                                            {selectedRecord.relatedList.map((related) => (
                                                <div
                                                    className="record-related-item"
                                                    key={`${related.relatedType}-${related.relatedNo}`}
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
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {selectedRecord.projectRecordType === "ISSUE"
                                && selectedRecord.projectRecordIssueStatus == "RESOLVED"
                                && (
                                    <div className="record-issue-resolution">
                                        <div className="record-resolution-title">
                                            해결 내용
                                        </div>

                                        <div>
                                            {selectedRecord.projectRecordIssueResolution}
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer className="record-detail-footer">
                    <div>
                        {canManageRecord && (
                            <Button
                                variant="danger"
                                onClick={deleteRecord}
                            >
                                삭제
                            </Button>
                        )}
                    </div>

                    <div className="record-detail-footer-actions">
                        {canManageRecord && (<>

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
        </div>
    </>)
}