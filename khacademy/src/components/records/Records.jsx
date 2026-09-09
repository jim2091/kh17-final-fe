import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Modal, Form, Badge, FormGroup, FormLabel } from "react-bootstrap";
import { Plus, FileText, Calendar, User } from "lucide-react";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";
import "./Records.css";

export default function Records() {

    const {projectNo} = useParams();

    //목록
    const [recordList, setRecordList] = useState([]);
    const [loading, setLoading] = useState(true);

    //등록 모달
    const [addModalOpen, setAddModalOpen] = useState(false);

    const [recordType, setRecordType] = useState("")
    const [recordTitle, setRecordTitle] = useState("");
    const [recordContent, setRecordContent] = useState("");

    //상세 모달
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const [selectedRecord, setSelectedRecord] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

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

    useEffect(() => {
        loadRecordList();
    }, []);

    //등록 모달 열기
    const openAddModal = useCallback(() => {
        setRecordType("");
        setRecordTitle("");
        setRecordContent("");

        setAddModalOpen(true);
    }, []);

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

        try {
            await apiClient.post(
                `/record/project/${projectNo}`,
                {
                    projectRecordType: recordType,
                    projectRecordTitle: recordTitle,
                    projectRecordContent: recordContent
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
    }, [recordType, recordTitle, recordContent]);

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

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setDetailModalOpen(false);
                            setSelectedRecord(null);
                        }}
                    >
                        닫기
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    </>)
}