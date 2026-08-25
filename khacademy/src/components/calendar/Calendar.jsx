import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./Calendar.css";
import { Button, Form, Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { apiClient } from "../../utils/reaxios";
import Swal from "sweetalert2";

export default function Calendar() {
    const { projectNo } = useParams();
    const [scheduleList, setScheduleList] = useState([]);
    const [loading, setLoading] = useState(false);

    //초기 목록 로딩
    useEffect(() => {
        loadScheduleList();
    }, []);

    const loadScheduleList = useCallback(async () => {
        const { data } = await apiClient.get(`/schedule/project/${projectNo}`)
        setScheduleList(data.scheduleList);
    }, []);

    //FullCallendar용 데이터로 변환
    const schedules = scheduleList.map(schedule => ({
        id: String(schedule.scheduleNo),
        title: schedule.scheduleTitle,
        start: schedule.scheduleStart,
        end: schedule.scheduleEnd || undefined,
    }));

    const handleDateClick = (info) => {
        console.log("날짜 클릭", info.dateStr);
    };

    


    //등록 관련
    const [inputModal, setInputModal] = useState(false);
    const openInputModal = useCallback(()=>{
        setInputModal(true);
    }, []);
    const closeInputModal = useCallback(() => {
        resetInput();
        setInputModal(false);
    }, []);

    const [scheduleInput, setScheduleInput] = useState({
        scheduleTitle: "",
        scheduleContent: "",
        scheduleStart: "",
        scheduleEnd: "",
        schedulePlace: "",
    });
    const [inputResult, setInputResult] = useState({
        scheduleTitle: null,
        scheduleContent: null,
        scheduleStart: null,
        scheduleEnd: null,
        schedulePlace: null,
    });

    const changeScheduleInput = useCallback((e) => {
        const { name, value } = e.target;

        setScheduleInput(prev => ({ ...prev, [name]: value }));
    }, []);

    const checkInput = useCallback((e) => {
        const {name} = e.target;
        const result = checkScheduleField(scheduleInput, name);
        setInputResult(prev=>({...prev, [name]: result}))
    }, [scheduleInput]);

    //얘는 수정에서도 쓰임
    const isAllValid = useCallback((result) => {
        if(result.scheduleTitle !== "is-valid") return false;
        if(result.scheduleContent === "is-invalid") return false;
        if(result.scheduleStart !== "is-valid") return false;
        if(result.scheduleEnd === "is-invalid") return false;
        if(result.schedulePlace === "is-invalid") return false;

        return true;
    }, []);

    const inputAllValid = useMemo(() => {
        return isAllValid(inputResult);
    }, [inputResult]);


    const resetInput = useCallback(() => {
        setScheduleInput({
            scheduleTitle: "",
            scheduleContent: "",
            scheduleStart: "",
            scheduleEnd: "",
            schedulePlace: "",
        });
        setInputResult({
            scheduleTitle: null,
            scheduleContent: null,
            scheduleStart: null,
            scheduleEnd: null,
            schedulePlace: null,
        });
    }, []);

    
    const addSchedule = useCallback(async()=>{
        try {
            //projectNo가 필요함
            const requestData = {
                projectNo: Number(projectNo),
                scheduleTitle: scheduleInput.scheduleTitle,
                scheduleContent: scheduleInput.scheduleContent,
                scheduleStart: scheduleInput.scheduleStart,
                scheduleEnd: scheduleInput.scheduleEnd || null,
                schedulePlace: scheduleInput.schedulePlace,
            };
    
            await apiClient.post("/schedule/", requestData);
    
            toast.success("일정이 등록되었습니다");
            closeInputModal();
            loadScheduleList();
        }
        catch(e) {
            console.error(e);
            toast.error("일정 등록에 실패했습니다. \n잠시 후에 다시 시도해주세요")
        }
    }, [scheduleInput]);

    //상세 관련
    const [detailModal, setDetailModal] = useState(false);
    
    const [scheduleDetail, setScheduleDetail] = useState(null);
    const [editMode, setEditMode] = useState(false);
    
    const [scheduleEdit, setScheduleEdit] = useState({
        scheduleTitle: "",
        scheduleContent: "",
        scheduleStart: "",
        scheduleEnd: "",
        schedulePlace: "",
    });

    const closeDetailModal = useCallback(() => {
        setDetailModal(false);
        setScheduleDetail(null);
        setEditMode(false);

        setScheduleEdit({
            scheduleTitle: "",
            scheduleContent: "",
            scheduleStart: "",
            scheduleEnd: "",
            schedulePlace: "",
        });
        setEditResult({
            scheduleTitle: null,
            scheduleContent: null,
            scheduleStart: null,
            scheduleEnd: null,
            schedulePlace: null,
        });
    }, []);
    
    const handleScheduleClick = useCallback(async (info) => {
        const scheduleNo = info.event.id;

        try{
            const {data} = await apiClient.get(
                `/schedule/${scheduleNo}`
            );
            setScheduleDetail(data);
            setDetailModal(true);
            setEditMode(false);
        }
        catch(e) {
            console.error(e);
            toast.error("일정 정보를 불러오지 못했습니다. \n잠시 후에 다시 시도해주세요");
        }
    }, []);

    //수정 관련
    const [editResult, setEditResult] = useState({
        scheduleTitle: null,
        scheduleContent: null,
        scheduleStart: null,
        scheduleEnd: null,
        schedulePlace: null,
    });

    const openEditMode = useCallback(()=>{
        if(scheduleDetail === null) return;

        setScheduleEdit({
            scheduleTitle : scheduleDetail.scheduleTitle || "",
            scheduleContent : scheduleDetail.scheduleContent || "",
            scheduleStart : scheduleDetail.scheduleStart
                ? scheduleDetail.scheduleStart.slice(0,16) : "",
            scheduleEnd : scheduleDetail.scheduleEnd
                ? scheduleDetail.scheduleEnd.slice(0,16) : "",
            schedulePlace : scheduleDetail.schedulePlace || "",
        });

        setEditMode(true);
    }, [scheduleDetail]);

    const changeScheduleEdit = useCallback((e) => {
        const {name, value} = e.target;

        setScheduleEdit(prev => ({...prev, [name]: value}));
    }, []);

    const checkEdit = useCallback((e) => {
        const {name} = e.target;
        setEditResult(prev => ({...prev, [name]: checkScheduleField(scheduleEdit, name)}));
    }, [scheduleEdit]);

    const editAllValid = useMemo(() => {
        return isAllValid(editResult);
    }, [editResult, isAllValid]);

    const cancelEditMode = useCallback(() => {
        setEditMode(false);
    }, []);

    const editSchedule = useCallback(async ()=>{
        if(scheduleDetail === null) return;
        
        try {
            const requestData = {
                scheduleTitle: scheduleEdit.scheduleTitle,
                scheduleContent: scheduleEdit.scheduleContent,
                scheduleStart: scheduleEdit.scheduleStart,
                scheduleEnd: scheduleEdit.scheduleEnd || null,
                schedulePlace: scheduleEdit.schedulePlace,
            };

            await apiClient.put(
                `/schedule/${scheduleDetail.scheduleNo}`,
                requestData
            );

            toast.success("일정이 수정되었습니다.");

            //달력 목록 갱신
            await loadScheduleList();

            //현재 상세 내용도 다시 조회
            const {data} = await apiClient.get(
                `/schedule/${scheduleDetail.scheduleNo}`
            );

            setScheduleDetail(data);

            //상세 모드로 복귀
            setEditMode(false);
        }
        catch(e) {
            console.error(e);
            toast.error("수정에 실패했습니다. \n잠시 후에 다시 시도해주세요");
        }
    }, [scheduleDetail, scheduleEdit]);

    //등록/수정 공통 체크 함수
    const checkScheduleField = useCallback((input, name)=>{
        switch(name) {
            case "scheduleTitle":
                return input.scheduleTitle.trim().length > 0
                    ? "is-valid" : "is-invalid";
            case "scheduleStart":
                return input.scheduleStart.length > 0
                    ? "is-valid" : "is-invalid";
            case "scheduleEnd":
                return (input.scheduleEnd.length === 0 || 
                    input.scheduleStart < input.scheduleEnd)
                    ? "is-valid" : "is-invalid";
            default:
                return null;
        }
    }, []);

    //삭제
    const deleteSchedule = useCallback(async()=>{
        if(scheduleDetail === null) return;

        const result = await Swal.fire({
            title: "일정을 삭제하시겠습니까?",
            text: "삭제한 일정은 복구할 수 없습니다",
            icon: "warning",
            showCancelButton: "true",
            confirmButtonText: "삭제",
            cancelButtonTest: "취소"
        });

        if(result.isConfirmed === false) return;

        try {
            await apiClient.delete(`/schedule/${scheduleDetail.scheduleNo}`);
            toast.success("일정이 삭제되었습니다");

            closeDetailModal();
            loadScheduleList();
        }
        catch(e){
            console.error(e);
            toast.error("일정 삭제에 실패했습니다 \n잠시 후에 다시 시도해주세요");
        }
    }, [scheduleDetail]);

    return (<>
        <div className="calendar-page">
            <div className="calendar-card">

                <FullCalendar
                    plugins={[
                        dayGridPlugin,
                        interactionPlugin
                    ]}
                    initialView="dayGridMonth"

                    locale="ko"
                    height="auto"

                    customButtons={{
                        addSchedule: {
                            text: "일정 등록",
                            click: () => {
                                openInputModal();
                            }
                        }
                    }}

                    headerToolbar={{
                        left: "prev,next today",
                        center: "title",
                        right: "addSchedule"
                    }}

                    events={schedules}

                    dateClick={handleDateClick}
                    eventClick={handleScheduleClick}
                />

            </div>
        </div>

        {/* 등록 모달 */}
        <Modal show={inputModal} onHide={closeInputModal} centered>
            <Modal.Header closeButton>
                <Modal.Title>일정 등록</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>일정 제목</Form.Label>
                        <Form.Control type="text" name="scheduleTitle"
                            value={scheduleInput.scheduleTitle}
                            onChange={changeScheduleInput}
                            className={inputResult.scheduleTitle}
                            onBlur={checkInput}
                            maxLength={300} placeholder="일정 제목을 입력하세요"
                            autoFocus
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>일정 내용</Form.Label>
                        <Form.Control as="textarea" rows={4}
                            name="scheduleContent"
                            value={scheduleInput.scheduleContent}
                            onChange={changeScheduleInput}
                            className={inputResult.scheduleContent}
                            maxLength={1000}
                            placeholder="일정 내용을 입력하세요"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>시작 일시</Form.Label>
                        <Form.Control type="datetime-local" name="scheduleStart"
                            value={scheduleInput.scheduleStart}
                            onChange={changeScheduleInput}
                            className={inputResult.scheduleStart}
                            onBlur={checkInput}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>종료 일시</Form.Label>
                        <Form.Control type="datetime-local" name="scheduleEnd"
                            value={scheduleInput.scheduleEnd}
                            onChange={changeScheduleInput}
                            className={inputResult.scheduleEnd}
                            onBlur={checkInput}
                        />
                        <div className="invalid-feedback">종료일시는 시작일시보다 빠를 수 없습니다</div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>장소</Form.Label>
                        <Form.Control type="text" name="schedulePlace"
                            value={scheduleInput.schedulePlace}
                            onChange={changeScheduleInput}
                            className={inputResult.schedulePlace}
                            maxLength={300}
                            placeholder="장소를 입력하세요"
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={closeInputModal}>
                    취소
                </Button>

                <Button variant="primary" onClick={addSchedule}
                        disabled={inputAllValid === false}>
                    등록
                </Button>
            </Modal.Footer>
        </Modal>

        {/* 상세 모달 */}
        <Modal show={detailModal} onHide={closeDetailModal} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    {editMode ? "일정 수정" : "일정 상세"}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {scheduleDetail !== null && (<>
                    {editMode === false ? (<>
                        {/* 상세 화면 */}
                        <div className="mb-3">
                            <strong>제목</strong>
                            <div>{scheduleDetail.scheduleTitle}</div>
                        </div>

                        <div className="mb-3">
                            <strong>내용</strong>
                            <div>
                                {scheduleDetail.scheduleContent || "-"}
                            </div>
                        </div>

                        <div className="mb-3">
                            <strong>시작 일시</strong>
                            <div>{scheduleDetail.scheduleStart}</div>
                        </div>

                        <div className="mb-3">
                            <strong>종료 일시</strong>
                            <div>
                                {scheduleDetail.scheduleEnd || "-"}
                            </div>
                        </div>

                        <div className="mb-3">
                            <strong>장소</strong>
                            <div>
                                {scheduleDetail.schedulePlace || "-"}
                            </div>
                        </div>
                    </>) : (<>
                        {/* 수정 화면 */}
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>일정 제목</Form.Label>

                                <Form.Control
                                    type="text"
                                    name="scheduleTitle"
                                    value={scheduleEdit.scheduleTitle}
                                    onChange={changeScheduleEdit}
                                    onBlur={checkEdit}
                                    className={editResult.scheduleTitle}
                                    maxLength={300}
                                />

                                <div className="invalid-feedback">
                                    일정 제목을 입력하세요
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>일정 내용</Form.Label>

                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    name="scheduleContent"
                                    value={scheduleEdit.scheduleContent}
                                    onChange={changeScheduleEdit}
                                    onBlur={checkEdit}
                                    className={editResult.scheduleContent}
                                    maxLength={1000}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>시작 일시</Form.Label>

                                <Form.Control
                                    type="datetime-local"
                                    name="scheduleStart"
                                    value={scheduleEdit.scheduleStart}
                                    onChange={changeScheduleEdit}
                                    onBlur={checkEdit}
                                    className={editResult.scheduleStart}
                                />

                                <div className="invalid-feedback">
                                    시작 일시를 입력하세요
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>종료 일시</Form.Label>

                                <Form.Control
                                    type="datetime-local"
                                    name="scheduleEnd"
                                    value={scheduleEdit.scheduleEnd}
                                    onChange={changeScheduleEdit}
                                    onBlur={checkEdit}
                                    className={editResult.scheduleEnd}
                                />

                                <div className="invalid-feedback">
                                    종료 일시는 시작 일시보다 빠를 수 없습니다
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>장소</Form.Label>

                                <Form.Control
                                    type="text"
                                    name="schedulePlace"
                                    value={scheduleEdit.schedulePlace}
                                    onChange={changeScheduleEdit}
                                    onBlur={checkEdit}
                                    className={editResult.schedulePlace}
                                    maxLength={300}
                                />
                            </Form.Group>
                        </Form>
                    </>)}
                </>)}
            </Modal.Body>

            <Modal.Footer className="justify-content-between">
                {editMode === false ? (<>
                    <Button variant="danger" onClick={deleteSchedule }>
                        삭제
                    </Button>
                    <div className="d-flex gap-2">
                        <Button variant="primary" onClick={openEditMode}>
                            수정
                        </Button>
                        <Button variant="secondary" onClick={closeDetailModal}>
                            닫기
                        </Button>
                    </div>
                </>) : (<>
                    <div></div>
                    <div className="d-flex gap-2">
                        <Button variant="secondary" onClick={cancelEditMode}>
                            취소
                        </Button>
                        <Button variant="primary" onClick={editSchedule} 
                                disabled={editAllValid === false}>
                            저장
                        </Button>
                    </div>
                </>)}

            </Modal.Footer>
        </Modal>

    </>)
}
