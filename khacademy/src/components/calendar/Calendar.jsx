import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Button, Form, Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { apiClient } from "../../utils/reaxios";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import DatePicker from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";

import "./Calendar.css";//얘는 css중에 제일 마지막에 불러오도록
// 참고
// 피드백 처음엔 배운대로 구현하다가
// 마음에 안드는거 조금씩 수정하다가
// 결국 valid시 딱히 없고 invalid일때만 빨간테두리 보여주는걸로 하기로 했는데
// 기존 코드 싹 고치기 귀찮아서 해당 부분은 css로 처리함

export default function Calendar() {
    const { projectNo } = useParams();
    const { project, loadProject } = useOutletContext();

    const [scheduleList, setScheduleList] = useState([]);
    const [loading, setLoading] = useState(false);
    //초기 목록 로딩
    useEffect(() => {
        loadScheduleList();
    }, []);

    const loadScheduleList = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get(`/schedule/project/${projectNo}`);
            setScheduleList(data.scheduleList);
        }
        catch (e) {
            console.error(e);
            toast.error("일정을 불러오지 못했습니다.");
        }
        finally {
            setLoading(false);
        }
    }, []);

    //FullCallendar용 데이터로 변환
    const schedules = scheduleList.map(schedule => {
        
        //여러 일자에 걸친 일정 처리 추가
        const isMultiday = 
            schedule.scheduleEnd &&
            !dayjs(schedule.scheduleStart)
                .isSame(dayjs(schedule.scheduleEnd), "day");

        return {
            id: String(schedule.scheduleNo),
            title: schedule.scheduleTitle,
            start: schedule.scheduleStart,
            end: schedule.scheduleEnd || undefined,
            
            //여러 날짜에 걸치는 일정은 주간 화면에서 상단에 표시
            allDay: isMultiday,

            backgroundColor: "#6f8fcf",
        };
    });

    //현재 view state
    const [currentView, setCurrentView] = useState("dayGridMonth");

    //다가오는 일정
    const upcomingSchedules = useMemo(() => {
        const now = dayjs();

        return scheduleList
            .filter(schedule => {
                if (!schedule.scheduleStart) return false;
                return dayjs(schedule.scheduleStart).isAfter(now)
                    || dayjs(schedule.scheduleStart).isSame(now, "minute");
            })
            .sort((a, b) => {
                return dayjs(a.scheduleStart).valueOf()
                    - dayjs(b.scheduleStart).valueOf()
            })
            .slice(0, 5);
    }, [scheduleList]);

    //오늘 일정
    const todaySchedules = useMemo(() => {
        return scheduleList.filter(schedule => {
            if (!schedule.scheduleStart) return false;
            return dayjs(schedule.scheduleStart).isSame(dayjs(), "day");
        })
    }, [scheduleList]);

    //이번 주 일정 개수
    const thisWeekScheduleCount = useMemo(() => {
        const today = dayjs();

        //오늘에서 며칠을 빼야 월요일이 되는지 계산
        const mondayOffset = today.day() === 0 ? -6 : 1 - today.day();

        const startOfWeek = today
            .add(mondayOffset, "day")//이번주 월요일 계산
            .startOf("day");//그날의 시작시간
        const endOfWeek = startOfWeek
            .add(6, "day")//시작일인 월요일에 6을 더하고
            .endOf("day");//그날의 마지막시간

        return scheduleList.filter(schedule => {
            if (!schedule.scheduleStart) return false;
            const scheduleStart = dayjs(schedule.scheduleStart);
            const scheduleEnd = schedule.scheduleEnd
                ? dayjs(schedule.scheduleEnd) : scheduleStart;
            return (
                scheduleStart.isBefore(endOfWeek) || scheduleStart.isSame(endOfWeek)
            ) && (
                    scheduleEnd.isAfter(startOfWeek) || scheduleEnd.isSame(startOfWeek)
                );
        }).length;

    }, [scheduleList]);

    //등록 관련
    const [inputModal, setInputModal] = useState(false);
    const openInputModal = useCallback(() => {
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
        const { name } = e.target;
        const result = checkScheduleField(scheduleInput, name);
        setInputResult(prev => ({ ...prev, [name]: result }))
    }, [scheduleInput]);

    //얘는 수정에서도 쓰임
    const isAllValid = useCallback((result) => {
        if (result.scheduleTitle !== "is-valid") return false;
        if (result.scheduleContent === "is-invalid") return false;
        if (result.scheduleStart !== "is-valid") return false;
        if (result.scheduleEnd === "is-invalid") return false;
        if (result.schedulePlace === "is-invalid") return false;

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


    const addSchedule = useCallback(async () => {
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
        catch (e) {
            console.error(e);
            toast.error("일정 등록에 실패했습니다. \n잠시 후에 다시 시도해주세요")
        }
    }, [scheduleInput]);

    const handleDateClick = useCallback((info) => {

        let start;
        //월간에서 클릭한 날짜의 오전 9시로 자동 입력
        if (info.view.type === "dayGridMonth") {
            start = `${info.dateStr}T09:00`;
        }
        //주간에서 클릭한 시간 그대로 자동 입력
        else {
            start = dayjs(info.date).format("YYYY-MM-DDTHH:mm");
        }

        setScheduleInput(prev => ({
            ...prev,
            scheduleStart: start,
        }));

        setInputResult(prev => ({ ...prev, scheduleStart: "is-valid" }));
        setInputModal(true);
    }, []);

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

    //일정 상세 조회
    const openScheduleDetail = useCallback(async (scheduleNo) => {
        try {
            const { data } = await apiClient.get(`/schedule/${scheduleNo}`);
            setScheduleDetail(data);
            setDetailModal(true);
            setEditMode(false);
        }
        catch (e) {
            console.error(e);
            toast.error("일정 정보를 불러오지 못했습니다. \n잠시 후에 다시 시도해주세요")
        };
    }, []);

    const handleScheduleClick = useCallback((info) => {
        openScheduleDetail(info.event.id);
    }, [openScheduleDetail]);

    //수정 관련
    const [editResult, setEditResult] = useState({
        scheduleTitle: null,
        scheduleContent: null,
        scheduleStart: null,
        scheduleEnd: null,
        schedulePlace: null,
    });

    const openEditMode = useCallback(() => {
        if (scheduleDetail === null) return;

        const editData = {
            scheduleTitle: scheduleDetail.scheduleTitle || "",
            scheduleContent: scheduleDetail.scheduleContent || "",
            scheduleStart: scheduleDetail.scheduleStart
                ? scheduleDetail.scheduleStart.slice(0, 16)
                : "",
            scheduleEnd: scheduleDetail.scheduleEnd
                ? scheduleDetail.scheduleEnd.slice(0, 16)
                : "",
            schedulePlace: scheduleDetail.schedulePlace || "",
        };

        setScheduleEdit(editData);
        //수정모드 들어가자마자 전체 체크 한번 해버리는걸로
        //이렇게 안하면 필수값들 하나하나 다 blur 일으켜야 저장버튼 활성화되니까
        setEditResult({
            scheduleTitle: checkScheduleField(editData, "scheduleTitle"),
            scheduleContent: null,
            scheduleStart: checkScheduleField(editData, "scheduleStart"),
            scheduleEnd: checkScheduleField(editData, "scheduleEnd"),
            schedulePlace: null,
        });

        setEditMode(true);
    }, [scheduleDetail]);

    const changeScheduleEdit = useCallback((e) => {
        const { name, value } = e.target;

        setScheduleEdit(prev => ({ ...prev, [name]: value }));
    }, []);

    const checkEdit = useCallback((e) => {
        const { name } = e.target;
        setEditResult(prev => ({ ...prev, [name]: checkScheduleField(scheduleEdit, name) }));
    }, [scheduleEdit]);

    //하던대로 필수항목의 result가 valid인가로 체크하게되면 문제가 있음
    //실제로 입력된 값을 하나씩따지도록 수정
    const editAllValid = useMemo(() => {
        if (scheduleEdit.scheduleTitle.trim().length === 0) return false;
        if (scheduleEdit.scheduleStart.length === 0) return false;
        if (scheduleEdit.scheduleEnd.length > 0 &&
            scheduleEdit.scheduleStart >= scheduleEdit.scheduleEnd)
            return false;
        return true;
    }, [scheduleEdit]);

    const cancelEditMode = useCallback(() => {
        setEditMode(false);
    }, []);

    const editSchedule = useCallback(async () => {
        if (scheduleDetail === null) return;

        //저장 버튼의 disabled가 어떻든 여기서도 체크하고.
        if (scheduleEdit.scheduleTitle.trim().length === 0) return;
        if (scheduleEdit.scheduleStart.length === 0) return;
        if (scheduleEdit.scheduleEnd.length > 0 &&
            scheduleEdit.scheduleStart >= scheduleEdit.scheduleEnd)
            return;

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
            const { data } = await apiClient.get(
                `/schedule/${scheduleDetail.scheduleNo}`
            );

            setScheduleDetail(data);

            //상세 모드로 복귀
            setEditMode(false);
        }
        catch (e) {
            console.error(e);
            toast.error("수정에 실패했습니다. \n잠시 후에 다시 시도해주세요");
        }
    }, [scheduleDetail, scheduleEdit]);

    //등록/수정 공통 체크 함수
    const checkScheduleField = useCallback((input, name) => {
        switch (name) {
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
    const deleteSchedule = useCallback(async () => {
        if (scheduleDetail === null) return;

        const result = await Swal.fire({
            title: "일정을 삭제하시겠습니까?",
            text: "삭제한 일정은 복구할 수 없습니다",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "삭제",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;

        try {
            await apiClient.delete(`/schedule/${scheduleDetail.scheduleNo}`);
            toast.success("일정이 삭제되었습니다");

            closeDetailModal();
            loadScheduleList();
        }
        catch (e) {
            console.error(e);
            toast.error("일정 삭제에 실패했습니다 \n잠시 후에 다시 시도해주세요");
        }
    }, [scheduleDetail]);

    //시간 형식 변경
    const formatScheduleDate = (value) => {
        if (!value) return "-";

        return dayjs(value).format("YYYY-MM-DD HH:mm")
    };

    const formatUpcomingDate = (value) => {
        if (!value) return "";

        const target = dayjs(value);
        const today = dayjs();

        if (target.isSame(today, "day")){
            return "오늘"
        }
        if (target.isSame(today.add(1, "day"), "day")){
            return "내일"
        }
        
        return dayjs(value).format("M/D")
    }

    //다른 월에서 일정 등록 등 후에 다시 현재 월로 안오게 되려나
    const [currentDate, setCurrentDate] = useState(new Date());

    //여기 함수 네개 참 애매하네 이렇게까지 반복해야하나
    //jsx안에 바로 각각 써주기 길어서 따로 뺀건데 따로 빼도 뭐 크게 다를바 없네 이러면..

    //datepicker 등록/수정 모달 시작/종료일 변경
    //여기선 변경된 값 형태 변경해서 저장 및 그에 따른 result 변경 까지만
    //invalid는 그냥 시작일 없을때만 주는걸로
    //굳이 여기서 빡세게 나눠서 함수까지 더만들어가며 컨트롤해주긴 좀 그렇다
    //어차피 다른 부분들에서 입력안되게 혹은 전송안되게 막고 있으니까.
    const changeScheduleDate = useCallback((name, date)=>{
        const value = date ? dayjs(date).format("YYYY-MM-DDTHH:mm") : "";

        setScheduleInput(prev => ({
            ...prev,
            [name]: value
        }));

        setInputResult(prev=>({
            ...prev,
            [name]:
                name === "scheduleStart" && value.length === 0
                    ? "is-invalid" : "is-valid"
        }));
    }, []);

    const changeScheduleEditDate = useCallback((name, date) => {
        const value = date ? dayjs(date).format("YYYY-MM-DDTHH:mm") : "";
        setScheduleEdit(prev=>({
            ...prev,
            [name]: value
        }));
        setEditResult(prev=>({
            ...prev,
            [name]:
                name === "scheduleStart" && value.length === 0
                    ? "is-invalid" : "is-valid"
        }));
    }, []);

    //연/월 선택 이동
    const calendarRef = useRef(null);

    //이동할 연/월/일 state
    const [moveYear, setMoveYear] = useState(dayjs(currentDate).year());
    const [moveMonth, setMoveMonth] = useState(dayjs(currentDate).month()+1);//1월이 0임
    const [moveDate, setMoveDate] = useState(dayjs(currentDate).toDate());

    const moveCalendar = useCallback(()=>{
        const calendarApi = calendarRef.current.getApi();

        //월간
        if(currentView === "dayGridMonth") {
            const targetDate = dayjs()
                .year(Number(moveYear))
                .month(Number(moveMonth) - 1)
                .date(1)
                .format("YYYY-MM-DD");
    
            calendarApi.gotoDate(targetDate);
        }
        //주간/목록
        else {
            calendarApi.gotoDate(moveDate);
        }

        setMoveModal(false);
    },[moveYear, moveMonth, moveDate, currentView]);

    //이동 연/월 선택 모달
    const [moveModal, setMoveModal] = useState(false);

    const openMoveModal = useCallback(()=>{
        setMoveYear(dayjs(currentDate).year());
        setMoveMonth(dayjs(currentDate).month()+1);
        setMoveDate(dayjs(currentDate).toDate());

        setMoveModal(true);
    }, [currentDate]);

    const closeMoveModal = useCallback(()=>{
        setMoveModal(false);
    }, []);

    //View에 따라 다른 제목 state
    const getCalendarTitle = useCallback(()=>{
        //월간
        if (currentView === "dayGridMonth") {
            return dayjs(currentDate).format("YYYY년 M월");
        }
        //주간/목록
        const calendarApi = calendarRef.current?.getApi();

        if(!calendarApi) {
            return dayjs(currentDate).format("YYYY년 M월");
        }

        const view = calendarApi.view;
        const start = dayjs(view.activeStart);
        const end = dayjs(view.activeEnd).subtract(1, "day");

        return `${start.format("YYYY.MM.DD")} ~ ${end.format("MM.DD")}`;

    }, [currentDate, currentView]);



    return (<>
        <div className="calendar-page">
            <div className="calendar-main">
                {/* 달력 */}
                <div className="calendar-card">
                    {loading ? (
                        <div className="calendar-loading">
                            일정을 불러오는 중입니다...
                        </div>
                    ) : (
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[
                                dayGridPlugin,
                                timeGridPlugin,
                                listPlugin,
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
                                },

                                moveMonth: {
                                    text: getCalendarTitle(),
                                    click: openMoveModal
                                }
                            }}

                            buttonText={{
                                today: "오늘",
                                month: "월",
                                week: "주",
                                list: "목록"
                            }}

                            slotMinTime="07:00:00"
                            slotMaxTime="22:00:00"
                            scrollTime="09:00:00"

                            allDayText="-"
                            slotLabelFormat={{
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false
                            }}

                            headerToolbar={{
                                left: "prev,next today",
                                center: "moveMonth",//원래 여기 title이라고 써야 자동으로 해당 연월이 제목처럼 생김
                                //근데 거기엔 우리가 따로 onclick같은 이벤트를 걸 수 없어서 커스텀 버튼을 만들어서 넣어줄거
                                right: "dayGridMonth,timeGridWeek,listWeek addSchedule"
                            }}

                            events={schedules}

                            dateClick={handleDateClick}
                            eventClick={handleScheduleClick}

                            dayMaxEvents={2}

                            initialDate={currentDate}

                            datesSet={(info) => {
                                setCurrentDate(info.view.currentStart);
                                setCurrentView(info.view.type);
                            }}
                        />
                    )}


                </div>

                {/* 오른쪽 사이드 */}
                <div className="calendar-side">
                    {/* 이번 주 일정 */}
                    <div className="calendar-week-summary">
                        <div className="calendar-week-label">
                            이번 주 일정
                        </div>
                        <div className="calendar-week-count">
                            {thisWeekScheduleCount}건
                        </div>
                    </div>

                    {/* 오늘 일정 */}
                    <div className="calendar-side-section">
                        <div className="calendar-side-title">
                            오늘 일정
                        </div>
                        <div className="calendar-side-list">
                            {todaySchedules.length === 0 ? (
                                <div className="calendar-side-empty">
                                    오늘 예정된 일정이 없습니다.
                                </div>
                            ) : (
                                todaySchedules.map(schedule => {
                                    const now = dayjs();

                                    const scheduleLastTime = schedule.scheduleEnd
                                        ? dayjs(schedule.scheduleEnd)
                                        : dayjs(schedule.scheduleStart)
                                    
                                    const isPast = scheduleLastTime.isBefore(now);
                                    const isOngoing = schedule.scheduleEnd
                                        && dayjs(schedule.scheduleStart).isBefore(now)
                                        && dayjs(schedule.scheduleEnd).isAfter(now);
                                    
                                    return(
                                        <div
                                            key={schedule.scheduleNo}
                                            className={`calendar-side-item
                                                ${isPast ? "calendar-side-item-past" : ""}
                                                ${isOngoing ? "calendar-side-item-ongoing" : ""}
                                            `}
                                            onClick={() => openScheduleDetail(schedule.scheduleNo)}
                                        >
                                            <div className="calendar-today-time">
                                                {dayjs(schedule.scheduleStart).format("HH:mm")}
                                                {schedule.scheduleEnd && (<>
                                                    {" - "}
                                                    {dayjs(schedule.scheduleEnd).format("HH:mm")}
                                                </>)}
                                            </div>

                                            <div className="calendar-side-content">
                                                <div className="calendar-side-item-title">
                                                    {schedule.scheduleTitle}
                                                </div>
                                                {schedule.schedulePlace && (
                                                    <div className="calendar-side-place">
                                                        {schedule.schedulePlace}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                                    
                             
                            )}
                        </div>
                    </div>

                    {/* 다가오는 일정 */}
                    <div className="calendar-side-section">
                        <div className="calendar-side-title">
                            다가오는 일정
                        </div>
                        <div className="calendar-side-list">
                            {upcomingSchedules.length === 0 ? (
                                <div className="calendar-side-empty">
                                    예정된 일정이 없습니다.
                                </div>
                            ) : (
                                upcomingSchedules.map(schedule => (
                                    <div
                                        key={schedule.scheduleNo}
                                        className="calendar-side-item"
                                        onClick={() => openScheduleDetail(schedule.scheduleNo)}
                                    >
                                        <div className="calendar-side-date">
                                            {formatUpcomingDate(schedule.scheduleStart)}
                                        </div>
                                        <div className="calendar-side-content">
                                            <div className="calendar-side-item-title">
                                                {schedule.scheduleTitle}
                                            </div>
                                            {schedule.schedulePlace && (
                                                <div className="calendar-side-place">
                                                    {schedule.schedulePlace}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* 등록 모달 */}
        <Modal show={inputModal} onHide={closeInputModal}
            centered className="schedule-modal" restoreFocus={false}>

            <Modal.Header closeButton>
                <Modal.Title>일정 등록</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>
                            <span>일정 제목</span>
                            <span className="required-mark">*</span>
                        </Form.Label>
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
                        <Form.Label>
                            <span>시작일시</span>
                            <span className="required-mark">*</span>
                        </Form.Label>
                        {/* <Form.Control type="datetime-local" name="scheduleStart"
                            value={scheduleInput.scheduleStart}
                            onChange={changeScheduleInput}
                            className={inputResult.scheduleStart}
                            onBlur={checkInput}
                        /> */}
                        {/* datepicker로 변경 */}
                        <DatePicker
                            selected={
                                scheduleInput.scheduleStart
                                    ? dayjs(scheduleInput.scheduleStart).toDate() : null
                            }
                            onChange={(date) => changeScheduleDate("scheduleStart", date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={30}
                            dateFormat="yyyy-MM-dd HH:mm"
                            placeholderText="시작 일시를 선택하세요"
                            className={`form-control ${inputResult.scheduleStart || ""}`}
                            locale={ko}
                            timeCaption="시간"
                        />

                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>종료 일시</Form.Label>
                        <DatePicker
                            selected={
                                scheduleInput.scheduleEnd
                                    ? dayjs(scheduleInput.scheduleEnd).toDate() : null
                            }
                            onChange={(date) => changeScheduleDate("scheduleEnd", date)}
                            minDate={
                                scheduleInput.scheduleStart
                                    ? dayjs(scheduleInput.scheduleStart).toDate() : undefined
                            }
                            filterTime={(time)=>{
                                if(!scheduleInput.scheduleStart) return true;

                                const start = dayjs(scheduleInput.scheduleStart);
                                const target = dayjs(time);

                                //시작일과 다른 날짜면 모든 시간 선택 가능
                                if(!target.isSame(start, "day")) return true;

                                //같은 날짜면 시작시간 이후만 선택 가능
                                return target.isAfter(start);
                            }}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={30}
                            dateFormat="yyyy-MM-dd HH:mm"
                            placeholderText="종료 일시를 선택하세요"
                            className={`form-control ${inputResult.scheduleEnd || ""}`}
                            locale={ko}
                            timeCaption="시간"
                        />
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
        <Modal show={detailModal} onHide={closeDetailModal}
            centered className="schedule-detail-modal" restoreFocus={false}>
            <Modal.Header closeButton>
                <Modal.Title>
                    {editMode ? "일정 수정" : "일정 상세"}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {scheduleDetail !== null && (<>
                    {editMode === false ? (
                        <div className="schedule-detail">
                            {/* 상세 화면 */}
                            <div className="schedule-detail-title">
                                <div>{scheduleDetail.scheduleTitle}</div>
                            </div>

                            <div className="schedule-detail-info">
                                <div className="schedule-detail-row">
                                    <div className="schedule-detail-label">
                                        시작
                                    </div>
                                    <div className="schedule-detail-value">
                                        {formatScheduleDate(scheduleDetail.scheduleStart)}
                                    </div>
                                </div>

                                <div className="schedule-detail-row">
                                    <div className="schedule-detail-label">
                                        종료
                                    </div>
                                    <div className="schedule-detail-value">
                                        {formatScheduleDate(scheduleDetail.scheduleEnd) || "-"}
                                    </div>
                                </div>
                                <div className="schedule-detail-row">
                                    <div className="schedule-detail-label">
                                        장소
                                    </div>
                                    <div className="schedule-detail-value">
                                        {scheduleDetail.schedulePlace || "-"}
                                    </div>
                                </div>
                                <div className="schedule-detail-row">
                                    <div className="schedule-detail-label">
                                        내용
                                    </div>
                                    <div className="schedule-detail-value">
                                        {scheduleDetail.scheduleContent || "등록된 내용이 없습니다"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (<>
                        {/* 수정 화면 */}
                        <Form className="schedule-edit-form">
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
                                <DatePicker
                                    selected={
                                        scheduleEdit.scheduleStart
                                            ? dayjs(scheduleEdit.scheduleStart).toDate() : null
                                    }
                                    onChange={(date) => changeScheduleEditDate("scheduleStart", date)}
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={30}
                                    dateFormat="yyyy-MM-dd HH:mm"
                                    placeholderText="시작 일시를 선택하세요"
                                    className={`form-control ${editResult.scheduleStart || ""}`}
                                    locale={ko}
                                    timeCaption="시간"
                                />

                            </Form.Group>
                            

                            <Form.Group className="mb-3">
                                <Form.Label>종료 일시</Form.Label>

                                <DatePicker
                                    selected={
                                        scheduleEdit.scheduleEnd
                                            ? dayjs(scheduleEdit.scheduleEnd).toDate() : null
                                    }
                                    onChange={(date) => changeScheduleEditDate("scheduleEnd", date)}
                                    minDate={
                                        scheduleEdit.scheduleStart
                                            ? dayjs(scheduleEdit.scheduleStart).toDate() : undefined
                                    }
                                    filterTime={(time)=>{
                                        if(!scheduleEdit.scheduleStart) return true;

                                        const start = dayjs(scheduleEdit.scheduleStart);
                                        const target = dayjs(time);

                                        //시작일과 다른 날짜면 모든 시간 선택 가능
                                        if(!target.isSame(start, "day")) return true;

                                        //같은 날짜면 시작시간 이후만 선택 가능
                                        return target.isAfter(start);
                                    }}
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={30}
                                    dateFormat="yyyy-MM-dd HH:mm"
                                    placeholderText="종료 일시를 선택하세요"
                                    className={`form-control ${editResult.scheduleEnd || ""}`}
                                    locale={ko}
                                    timeCaption="시간"
                                />
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
                    <Button variant="danger" onClick={deleteSchedule}>
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

        {/* 선택 모달 */}
        <Modal
            show={moveModal}
            onHide={closeMoveModal}
            centered
            className="calendar-move-modal calendar-week-move-modal"
        >
            <Modal.Header closeButton>
                {currentView === "dayGridMonth"
                    ? "연/월 이동"
                    : "날짜 이동"}
            </Modal.Header>

            <Modal.Body>
                {currentView === "dayGridMonth" ? (<>
                    {/* 월간 이동 */}
                    <Form.Group className="mb-3">
                        <Form.Label>연도</Form.Label>

                        <Form.Control
                            type="number"
                            value={moveYear}
                            onChange={(e)=>setMoveYear(e.target.value)}
                            min={1900}
                            max={2100}
                        />
                    </Form.Group>

                    <Form.Group>

                        <Form.Label>월</Form.Label>

                        <Form.Select
                            value={moveMonth}
                            onChange={(e)=>setMoveMonth(e.target.value)}
                            >
                            {Array.from({ length: 12 }, (_, index)=> (
                                <option
                                key={index + 1}
                                value={index + 1}
                                >
                                    {index + 1}월
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </>) : (<>
                    {/* 주간 이동 */}
                    <div className="calendar-move-week">
                        <div className="calendar-move-week-guide">
                            <div>이동할 날짜를 선택하세요.</div>
                            <small>선택한 날짜가 포함된 주로 이동합니다.</small>
                        </div>

                        <DatePicker
                            selected={moveDate}
                            onChange={(date) => {
                                if(date) {
                                    setMoveDate(date);
                                }
                            }}
                            inline
                            locale={ko}
                        />
                    </div>
                </>)}
            </Modal.Body>
            
            <Modal.Footer>
                <Button variant="secondary" onClick={closeMoveModal}>
                    취소
                </Button>

                <Button variant="primary" onClick={moveCalendar}>
                    이동
                </Button>
            </Modal.Footer>
        </Modal>

    </>)
}
