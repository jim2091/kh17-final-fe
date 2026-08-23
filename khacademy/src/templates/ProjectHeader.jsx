import { useParams } from "react-router-dom";

export default function ProjectHeader() {

    const {projectNo} = useParams();

    return (<>
        <h2>
            프로젝트 제목
        </h2>

        <div>
            프로젝트 번호 : {projectNo}
        </div>
        
        <div>
            프로젝트 기간
        </div>

        <div>
            프로젝트 상태
        </div>
    </>)
}