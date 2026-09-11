import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Form, FormGroup, Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";
import { MoreVertical } from "lucide-react";

export default function RecordLinkModal({
    show,
    onHide,
    projectNo,
    relatedType,
    relatedNo,
    relatedTitle,
    onSuccess
}) {

    //CREATE / CONNECT 모드
    const [mode, setMode] = useState(null);

    //새 Record 작성
    const [recordType, setRecordType] = useState("");
    const [recordTitle, setRecordTitle] = useState("");
    const [recordContent, setRecordContent] = useState("");

    //기존 Record 연결
    const [recordList, setRecordList] = useState([]);
    const [selectedRecordNo, setSelectedRecordNo] = useState(null);
    const [keyword, setKeyWord] = useState("");
    const [loading, setLoading] = useState(false);

    //initialize
    useEffect(() => {
        if(show) {//모달이 열릴 때
            setMode(null);
            setRecordType("");
            setRecordTitle("");
            setRecordContent("");
            setRecordList([]);
            setSelectedRecordNo(null);
            setKeyWord("");
        }

    }, [show]);

    //원본 데이터 타입 한글 변환
    const getRelatedTypeName = (type) => {
        switch(type) {
            case "TASK":
                return "업무";
            case "NOTE":
                return "노트";
            case "ATTACH":
                return "파일";
            case "MESSAGE":
                return "채팅";
            default:
                return type;

        }
    };

    //Record 타입 한글 변환
    const getRecordTypeName = (type) => {
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

    //기존 Record 목록 불러오기
    const openConnectMode = async () => {
        try {
            setLoading(true);

            const {data} = await apiClient.get(`/record/project/${projectNo}`);

            setRecordList(data || []);
            setSelectedRecordNo(null);
            setKeyWord("");

            setMode("CONNECT");
        }
        catch(e) {
            console.error(e);
            toast.error("기록 목록을 불러오지 못했습니다");
        }
        finally {
            setLoading(false);
        }
    };

    //새 Record 생성
    const createRecord = async () => {
        if(!recordType) {
            toast.warning("기록 유형을 선택해주세요");
            return;
        }
        if(!recordTitle) {
            toast.warning("제목을 입력해주세요");
            return;
        }
        if(!recordContent) {
            toast.warning("내용을 입력해주세요");
            return;
        }

        const requestData = {
            projectRecordType: recordType,
            projectRecordTitle: recordTitle,
            projectRecordContent: recordContent
        };

        //현재 원본을 새 Record에 연결
        switch(relatedType) {
            case "TASK":
                requestData.taskNoList = [relatedNo];
                break;
            
            case "NOTE":
                requestData.noteNoList = [relatedNo];
                break;
            
            case "ATTACH":
                requestData.attachNoList = [relatedNo];
                break;
            
            case "MESSAGE":
                requestData.chatMessageNoList = [relatedNo];
                break;
        }

        try {
            await apiClient.post(`/record/project/${projectNo}`, requestData);
            
            toast.success("새 Record로 등록되었습니다");

            onHide();

            if(onSuccess) {
                onSuccess();
            }
        }
        catch(e) {
            console.error(e);
            toast.error("Record 등록에 실패했습니다");
        }

    };

    //기존 Record에 연결
    const connectRecord = async () => {
        if(!selectedRecordNo) {
            toast.warning("연결할 Record를 선택해주세요");
            return;
        }

        try {
            await apiClient.post(
                `/record/${selectedRecordNo}/related`,
                {
                    relatedType: relatedType,
                    relatedNo: relatedNo
                }
            );

            toast.success("기존 Record에 연결되었습니다");

            onHide();

            if(onSuccess) {
                onSuccess();
            }
        }
        catch(e) {
            console.error(e);
            toast.error("Record 연결에 실패했습니다");
        }
    };

    //검색
    const filteredRecordList = 
        recordList.filter(record =>
            record.projectRecordTitle
                ?.toLowerCase()
                .includes(keyword.toLowerCase())
        );

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title>
                    Record로 남기기
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* 현재 원본 */}
                <div className="mb-3">
                    <Badge bg="light" text="dark">
                        {getRelatedTypeName(relatedType)}
                    </Badge>

                    <span className="ms-2">
                        {relatedTitle}
                    </span>
                </div>

                {/* 처음 화면 */}
                {mode === null && (
                    <div className="d-grid gap-2">
                        <Button
                            variant="primary"
                            onClick={() => setMode("CREATE")}
                        >
                            새 Record 만들기
                        </Button>

                        <Button
                            variant="outline-primary"
                            onClick={openConnectMode}
                        >
                            기존 Record에 연결하기
                        </Button>
                    </div>
                )}

                {/* 새 Record 생성 */}
                {mode === "CREATE" && (<>
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
                        <Form.Label>
                            제목
                        </Form.Label>

                        <Form.Control
                            type="text"
                            maxLength={300}
                            value={recordTitle}
                            onChange={e => setRecordTitle(e.target.value)}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Form.Label>
                            내용
                        </Form.Label>

                        <Form.Control
                            as="textarea"
                            rows={5}
                            value={recordContent}
                            onChange={e => setRecordContent(e.target.value)}
                        />
                    </FormGroup>
                </>)}

                {/* 기존 Record 연결 */}
                {mode === "CONNECT" && (<>
                    <Form.Control
                        type="text"
                        value={keyword}
                        onChange={e => setKeyWord(e.target.value)}
                        placeholder="Record 검색"
                        className="mb-3"
                    />

                    {loading ? (
                        <div>
                            불러오는 중입니다
                        </div>
                    ) : filteredRecordList.length === 0 ? (
                        <div>
                            연결할 Record가 없습니다
                        </div>
                    ) : (
                        <div 
                            style={{
                                maxHeight: "300px",
                                overflowY: "auto"
                            }}
                        >
                            {filteredRecordList.map(record => (
                                <div
                                    key={record.projectRecordNo}
                                    className="border rounded p-2 mb-2"
                                >
                                    <Form.Check
                                        type="radio"
                                        name="recordSelect"
                                        checked={selectedRecordNo === record.projectRecordNo}
                                        onChange={() => setSelectedRecordNo(record.projectRecordNo)}
                                        label={<>
                                            <Badge bg="secondary" className="me-2">
                                                {getRecordTypeName(record.projectRecordType)}
                                            </Badge>
                                            {record.projectRecordTitle}
                                        </>}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </>)}

            </Modal.Body>

            <Modal.Footer>
                {mode !== null && (
                    <Button
                        variant="secondary"
                        onClick={() => setMode(null)}
                    >
                        이전
                    </Button>
                )}

                {mode === "CREATE" && (
                    <Button
                        variant="primary"
                        onClick={createRecord}
                    >
                        Record 생성
                    </Button>
                )}

                {mode === "CONNECT" && (
                    <Button
                        variant="primary"
                        onClick={connectRecord}
                    >
                        연결
                    </Button>
                )}
            </Modal.Footer>

        </Modal>
    );
}