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
import { getWebSocketClient, onWebSocketConnect } from "../../utils/websocket";

import "./Calendar.css";//얘는 css중에 제일 마지막에 불러오도록
// 참고
// 피드백 처음엔 배운대로 구현하다가
// 마음에 안드는거 조금씩 수정하다가
// 결국 valid시 딱히 없고 invalid일때만 빨간테두리 보여주는걸로 하기로 했는데
// 기존 코드 싹 고치기 귀찮아서 해당 부분은 css로 처리함

export default function Calendar() {
    const { projectNo } = useParams();
    const { project, loadProject } = useOutletContext();

    //권한 + 프로젝트 상태에 따른 제어
    const isClosed = project?.projectStatus === "closed"
    //일정 작성자인지는 scheduleDetail이 생긴 후에 계산 가능해서 아래쪽으로 옮김
    const isManagerOrOwner = project?.projectMemberRole === "owner"
        || project?.projectMemberRole === "manager";
    const canAddSchedule = !isClosed;
    //수정/삭제 가능한지 판정도 작성자인지를 써야하니 아래로

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

    //웹소켓으로 변동사항 받아서 실시간 화면 갱신
    useEffect(()=>{

        let subscription = null;

        onWebSocketConnect(() => {
            const client = getWebSocketClient();//App.jsx에서 만든 공용 웹소켓 클라이언트를 가져와서
    
            if(client == null) return;
            //if(client.connected === false) return;//이제 없어도 됨 onWebSocketConnect안에 들어가니까
    
            subscription = client.subscribe(
                `/public/project/${projectNo}/schedule`,
                (message) => {//구독한 채널로부터 메세지가 오면 실행되는 함수
                    const json = JSON.parse(message.body);
                    
                    console.log("일정 변경 알림 수신", json);
    
                    loadScheduleList();//일정 페이지를 갱신
                }
            );
        });

        //클린업 함수
        return () => {
            //수업 채팅방 코드를 참고한다면 유의할 점
            //우리는 App.jsx에서 공용 웹소켓에 연결하고 그게 계속 이어지는 형태
            //여기서 그 연결을 끊어버리면 안됨. 구독만 끊어주는 것.
            //구독을 만약 안끊으면 일정 페이지 들어올때마다 구독이 누적됨
            subscription?.unsubscribe();
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

    //FullCalendar가 보여주고 있는 날짜
    const [currentDate, setCurrentDate] = useState(new Date());
    //View 변경시 기준이 되는 날짜
    const [anchorDate, setAnchorDate] = useState(new Date());
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
        //아마 버튼들 다 막아놔서 닫힌 프로젝트면 이걸 실행시킬 방법이 없겠지만 혹시나
        if(canAddSchedule === false) return;
        setInputModal(true);
    }, [canAddSchedule]);
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

        //종료된 프로젝트면 작동 안하게
        if(canAddSchedule === false) return;

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
    }, [canAddSchedule]);

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

    const isScheduleWriter = project?.projectMemberNo === scheduleDetail?.scheduleWriterNo;
    const canEditSchedule = !isClosed && (isScheduleWriter || isManagerOrOwner);

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

    //휠 연속 입력 방지
    //이 값이 변한다고 다시 렌더링할 필요가 없으니 state 말고 Ref로
    const wheelLockRef = useRef(false);

    //이동할 연/월/일 state
    const [moveYear, setMoveYear] = useState(dayjs(currentDate).year());
    const [moveMonth, setMoveMonth] = useState(dayjs(currentDate).month()+1);//1월이 0임
    const [moveDate, setMoveDate] = useState(dayjs(currentDate).toDate());

    const moveCalendar = useCallback(()=>{
        const calendarApi = calendarRef.current.getApi();

        //월간
        if(currentView === "dayGridMonth") {
            const targetMonth = dayjs()
                .year(Number(moveYear))
                .month(Number(moveMonth) - 1)
                .date(1);
            //월간 이동시 기존 기준일의 '일' 유지
            const anchorDay = dayjs(anchorDate).date();
            //31일 혹은 29일 이상일때 2월로 이동시 보정
            const targetDay = Math.min(anchorDay, targetMonth.daysInMonth());
            const targetDate = targetMonth.date(targetDay).toDate();

            setAnchorDate(targetDate);
            calendarApi.gotoDate(targetDate);
        }
        //주간/목록
        else {
            setAnchorDate(moveDate);
            calendarApi.gotoDate(moveDate);
        }

        setMoveModal(false);
    },[moveYear, moveMonth, moveDate, currentView, anchorDate]);

    //이동 연/월 선택 모달
    const [moveModal, setMoveModal] = useState(false);

    const openMoveModal = useCallback(()=>{
        setMoveYear(dayjs(currentDate).year());
        setMoveMonth(dayjs(currentDate).month()+1);
        setMoveDate(dayjs(anchorDate).toDate());

        setMoveModal(true);
    }, [currentDate, anchorDate]);

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

    const changeCalendarView = useCallback((viewName) => {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.changeView(viewName, anchorDate);
    }, [anchorDate]);

    //화살표도 anchorDate 쓰도록 하는 커스텀 버튼에 들어갈 함수
    const movePrev = useCallback(()=>{
        const calendarApi = calendarRef.current.getApi();
        calendarApi.prev();

        const viewType = calendarApi.view.type;

        //월 view일 경우 이전 앵커에서 월만 1 빼는 형태로
        if(viewType === "dayGridMonth") {
            setAnchorDate(prev => dayjs(prev).subtract(1, "month").toDate())
        }
        //주/목록 view일 경우 이전 앵커에서 주만 1빼는 형태로
        else {
            setAnchorDate(prev=>dayjs(prev).subtract(1, "week").toDate());
        }
    }, []);

    const moveNext = useCallback(()=>{
        const calendarApi = calendarRef.current.getApi();
        calendarApi.next();

        const viewType = calendarApi.view.type;

        if(viewType === "dayGridMonth") {
            setAnchorDate(prev => dayjs(prev).add(1, "month").toDate());
        }
        else {
            setAnchorDate(prev=>dayjs(prev).add(1, "week").toDate());
        }
    }, []);

    const moveToday = useCallback(()=>{
        const calendarApi = calendarRef.current.getApi();

        const today = new Date();

        setAnchorDate(today);
        calendarApi.today();
    }, []);

    //기존 이동 관련 버튼을 따로 커스텀버튼으로 교체하여 active 클래스 추가 별도로 해주는 함수
    const updateViewButtonActive = useCallback((viewType) => {
        const monthButton = document.querySelector(".fc-monthView-button");
        const weekButton = document.querySelector(".fc-weekView-button");
        const listButton = document.querySelector(".fc-listView-button");

        monthButton?.classList.remove("fc-button-active");
        weekButton?.classList.remove("fc-button-active");
        listButton?.classList.remove("fc-button-active");

        if(viewType === "dayGridMonth") {
            monthButton?.classList.add("fc-button-active");
        }
        else if(viewType === "timeGridWeek") {
            weekButton?.classList.add("fc-button-active");
        }
        if(viewType === "listWeek") {
            listButton?.classList.add("fc-button-active");
        }
    }, []);

    useEffect(()=>{
        const wheelButton = document.querySelector(".fc-wheelMove-button");

        if(!wheelButton) return;

        // 현재 view에 따라 툴팁 설명 변경
        if(currentView === "dayGridMonth") {
            wheelButton.title = "이 영역에서 마우스 휠을 사용하면 월 단위로 이동됩니다.";
        }
        else {
            wheelButton.title = "이 영역에서 마우스 휠을 사용하면 주 단위로 이동됩니다.";
        }

        const handleWheel = (e) => {
            //이 영역에서 휠을 굴릴 때 스크롤 방지
            e.preventDefault();

            //직전 휠 이동 처리 중이면 무시
            if(wheelLockRef.current === true) return;
            wheelLockRef.current = true;

            //아래로 휠
            if(e.deltaY > 0) {
                moveNext();
            }
            else if(e.deltaY < 0){
                movePrev();
            }

            //빠르게 휙휙 이동하지 않도록 잠깐 잠금
            setTimeout(()=>{
                wheelLockRef.current = false;
            }, 20);
        }

        wheelButton.addEventListener("wheel", handleWheel, {
            passive: false//이건 진짜 gpt 아니었으면 전혀 몰랐을듯
        });

        return () => {
            wheelButton.removeEventListener("wheel", handleWheel);
        }
    }, [currentView, movePrev, moveNext, loading]);//이것도 몰랐을듯
    //최초 렌더링시 loading이 false라 Fullcalendar가 잠깐 만들어짐
    //이때 휠 useEffect가 실행되면서 이 버튼에 이벤트가 붙음.
    //근데 이후 목록 조회가 시작되며 loading이 true가 되고 이때 Fullcalendar가 사라짐
    //그러니 loading도 의존배열에 넣어서 loading이 바뀌면 다시 effect 실행되도록 조치


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
                                prevCustom: {
                                    text: "<",
                                    click: movePrev
                                },
                                nextCustom: {
                                    text: ">",
                                    click: moveNext
                                },
                                todayCustom: {
                                    text: "오늘",
                                    click: moveToday
                                },
                                addSchedule: {
                                    text: "일정 등록",
                                    click: () => {
                                        openInputModal();
                                    }
                                },

                                moveMonth: {
                                    text: getCalendarTitle(),
                                    click: openMoveModal
                                },

                                monthView: {
                                    text: "월",
                                    click: () => changeCalendarView("dayGridMonth")
                                },
                                weekView: {
                                    text: "주",
                                    click: () => changeCalendarView("timeGridWeek")
                                },
                                listView: {
                                    text: "목록",
                                    click: () => changeCalendarView("listWeek")
                                },

                                wheelMove: {
                                    text: "↕ 휠 이동"
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
                                left: "prevCustom,nextCustom todayCustom",
                                center: "moveMonth",//원래 여기 title이라고 써야 자동으로 해당 연월이 제목처럼 생김
                                //근데 거기엔 우리가 따로 onclick같은 이벤트를 걸 수 없어서 커스텀 버튼을 만들어서 넣어줄거

                                //종료된 프로젝트면 등록 버튼이 안보이게 처리
                                right: canAddSchedule
                                // 월 -> 주 변경시 1일이 기준이 되므로 오늘을 포함하는 기간을 보여주지 않음
                                // ? "dayGridMonth,timeGridWeek,listWeek addSchedule"
                                // : "dayGridMonth,timeGridWeek,listWeek"
                                //그래서 별도로 버튼 만들어서 연결
                                ? "wheelMove monthView,weekView,listView addSchedule"
                                : "wheelMove monthView,weekView,listView"
                            }}

                            events={schedules}

                            dateClick={handleDateClick}
                            eventClick={handleScheduleClick}

                            dayMaxEvents={2}

                            initialDate={currentDate}

                            datesSet={(info) => {
                                setCurrentView(info.view.type);
                                setCurrentDate(info.view.currentStart);

                                updateViewButtonActive(info.view.type);
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
                    {canEditSchedule && (
                        <Button variant="danger" onClick={deleteSchedule}>
                            삭제
                        </Button>
                    )}
                    <div className="d-flex gap-2">
                        {canEditSchedule && (
                            <Button variant="primary" onClick={openEditMode}>
                                수정
                            </Button>
                        )}
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
