import FullCalendar, { useCalendarController } from "@fullcalendar/react";
import themePlugin from "@fullcalendar/react/themes/monarch"; // YOUR THEME
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import { useCallback, useEffect, useState } from "react";
import axios from 'axios';

// stylesheets
import '@fullcalendar/react/skeleton.css'; // ALWAYS NEED SKELETON
import '@fullcalendar/react/themes/monarch/theme.css'; // YOUR THEME
import '@fullcalendar/react/themes/monarch/palettes/purple.css'; // YOUR THEME'S PALETTE
import { useParams } from "react-router-dom";

export default function Calendar() {
    const {projectNo} = useParams();
    const [eventList, setEventList] = useState([]);
    const [loading, setLoading] = useState(false);

    //초기 목록 로딩
    useEffect(()=>{
        loadEventList();
    }, []);

    const loadEventList = useCallback(async() => {
        const {data} = await axios.get(`http://localhost:8080/api/schedule/project/${projectNo}`)
        setEventList(data.scheduleList);
    }, []);

    //FullCallendar용 데이터로 변환
    const events = eventList.map(event => ({
        id : String (event.scheduleNo),
        title : String (event.scheduleTitle),
        start : String (event.scheduleStart),
        end : String (event.scheduleEnd),
    }));

    const handleDateClick = (info) => {
        console.log("날짜 클릭", info.dateStr);
    };

    const handleEventClick = (info) => {
        console.log("일정 클릭", info.event.id);
    };

    return (<>

        <FullCalendar
            plugins={[
                themePlugin, 
                dayGridPlugin,
                interactionPlugin
            ]}
            initialView="dayGridMonth"

            locale="ko"
            height="auto"

            headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: ""
            }}

            events={events}

            dateClick={handleDateClick}
            eventClick={handleEventClick}
        />
    </>)
}
