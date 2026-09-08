import { useParams } from "react-router-dom";
import { useWebSocket } from "../../websocket/WebSocketProvider";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@utils/reaxios";

export default function ProjectPresenceSidebar() {

    const { projectNo } = useParams();

    const { presenceMap } = useWebSocket();

    const [memberList, setMemberList] = useState([]);

    const loadMemberList = useCallback(async () => {
        try {
            const {data} = await apiClient.get(`/presence/project/${projectNo}`);

            setMemberList(data);
        }
        catch(e) {
            console.error("프로젝트 Presence 조회 실패", e);
        }
    }, [projectNo]);

    useEffect(() => {
        loadMemberList();
    }, [loadMemberList]);

    return(
        <div className="project-presence-sidebar">
            <div className="project-presence-title">
                프로젝트 멤버
            </div>

            <div className="project-presence-list">
                {memberList.map(member => {
                    const status = presenceMap[member.empNo] || member.status;

                    return (
                        <div className="project-presence-item" key={member.empNo}>
                            <span className="project-presence-name">
                                {member.empName}
                            </span>
                            <span className="project-presence-status">
                                {status}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    )

}