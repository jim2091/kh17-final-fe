import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from 'axios';
import { useParams } from "react-router-dom";
import "./Calendar.css";
import { Button, Form, Modal } from "react-bootstrap";
import { toast } from "react-toastify";

export default function Calendar() {
    const { projectNo } = useParams();
    const [scheduleList, setScheduleList] = useState([]);
    const [loading, setLoading] = useState(false);

    //초기 목록 로딩
    useEffect(() => {
        loadScheduleList();
    }, []);

    const loadScheduleList = useCallback(async () => {
        const { data } = await axios.get(`http://localhost:8080/api/schedule/project/${projectNo}`)
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

    const checkScheduleTitle = useCallback(() => {
        const valid = scheduleInput.scheduleTitle.trim().length > 0;
        setInputResult(prev => ({
            ...prev,
            scheduleTitle: valid ? "is-valid" : "is-invalid"
        }));
    }, [scheduleInput]);

    const checkScheduleStart = useCallback(() => {
        const valid = scheduleInput.scheduleStart.length > 0
        setInputResult(prev => ({
            ...prev,
            scheduleStart: valid ? "is-valid" : "is-invalid"
        }));
    }, [scheduleInput]);

    const checkScheduleEnd = useCallback(() => {
        const valid = scheduleInput.scheduleEnd.length === 0 ||
            scheduleInput.scheduleStart < scheduleInput.scheduleEnd
        setInputResult(prev => ({
            ...prev,
            scheduleEnd: valid ? "is-valid" : "is-invalid"
        }));
    }, [scheduleInput]);

    const allValid = useMemo(() => {
        if (inputResult.scheduleTitle !== "is-valid") return false;
        if (inputResult.scheduleContent === "is-invalid") return false;
        if (inputResult.scheduleStart !== "is-valid") return false;
        if (inputResult.scheduleEnd === "is-invalid") return false;
        if (inputResult.schedulePlace === "is-invalid") return false;
        return true;
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
    
            await axios.post("http://localhost:8080/api/schedule/", requestData);
    
            toast.success("일정이 등록되었습니다");
            closeInputModal();
            loadScheduleList();
        }
        catch(e) {
            console.error(e);
            toast.error("일정 등록에 실패했습니다. \n잠시 후에 다시 시도해주세요")
        }
    }, []);

    //상세 관련
    const [detailModal, setDetailModal] = useState(false);
    const openDetailModal = useCallback(()=>{
        setDetailModal(true);
    }, []);
    const closeDetailModal = useCallback(() => {
        setDetailModal(false);
        setScheduleDetail(null);
    }, []);

    const [scheduleDetail, setScheduleDetail] = useState(null);

    const handleScheduleClick = useCallback(async (info) => {
        const scheduleNo = info.event.id;

        try{
            const {data} = await axios.get(
                `http://localhost:8080/api/schedule/${scheduleNo}`
            );
            setScheduleDetail(data);
            setDetailModal(true);
        }
        catch(e) {
            console.error(e);
            toast.error("일정 정보를 불러오지 못했습니다. \n잠시 후에 다시 시도해주세요");
        }
    }, []);

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
                            onBlur={checkScheduleTitle}
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
                            onBlur={checkScheduleStart}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>종료 일시</Form.Label>
                        <Form.Control type="datetime-local" name="scheduleEnd"
                            value={scheduleInput.scheduleEnd}
                            onChange={changeScheduleInput}
                            className={inputResult.scheduleEnd}
                            onBlur={checkScheduleEnd}
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
                        disabled={allValid === false}>
                    등록
                </Button>
            </Modal.Footer>
        </Modal>

        {/* 상세 모달 */}
        <Modal show={detailModal} onHide={closeDetailModal} centered>
            <Modal.Header closeButton>
                <Modal.Title>일정 상세</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {scheduleDetail !== null && (<>
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
                </>)}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={closeDetailModal}>
                    닫기
                </Button>
            </Modal.Footer>
        </Modal>

    </>)
}
