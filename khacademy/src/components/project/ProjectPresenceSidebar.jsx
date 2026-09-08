import { useParams } from "react-router-dom";
import { useWebSocket } from "../../websocket/WebSocketProvider";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@utils/reaxios";

export default function ProjectPresenceSidebar() {

    const { projectNo } = useParams();

    const { presenceMap, presenceReady } = useWebSocket();

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

        if(!presenceReady) return;

        loadMemberList();
        
    }, [presenceReady, loadMemberList]);

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
                            
                            <div className="project-presence-user">
                                <span className={`project-presence-dot ${status.toLowerCase()}`} />

                                <span className="project-presence-name">
                                    {member.empName}
                                </span>
                                
                                <span className="project-presence-status">
                                    {status === "ONLINE" && "온라인"}
                                    {status === "AWAY" && "자리비움"}
                                    {status === "OFFLINE" && "오프라인"}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )

}