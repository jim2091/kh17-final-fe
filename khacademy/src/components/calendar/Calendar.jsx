import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCallback, useEffect, useState } from "react";
import axios from 'axios';
import { useParams } from "react-router-dom";
import "./Calendar.css";

export default function Calendar() {
    const { projectNo } = useParams();
    const [eventList, setEventList] = useState([]);
    const [loading, setLoading] = useState(false);

    //초기 목록 로딩
    useEffect(() => {
        loadEventList();
    }, []);

    const loadEventList = useCallback(async () => {
        const { data } = await axios.get(`http://localhost:8080/api/schedule/project/${projectNo}`)
        setEventList(data.scheduleList);
    }, []);

    //FullCallendar용 데이터로 변환
    const events = eventList.map(event => ({
        id: String(event.scheduleNo),
        title: String(event.scheduleTitle),
        start: String(event.scheduleStart),
        end: String(event.scheduleEnd),
    }));

    const handleDateClick = (info) => {
        console.log("날짜 클릭", info.dateStr);
    };

    const handleEventClick = (info) => {
        console.log("일정 클릭", info.event.id);
    };

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
                                console.log("일정 등록");
                            }
                        }
                    }}

                    headerToolbar={{
                        left: "prev,next today",
                        center: "title",
                        right: "addSchedule"
                    }}

                    events={events}

                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                />

            </div>
        </div>
    </>)
}
