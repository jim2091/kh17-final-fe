import { useParams } from "react-router-dom";

import "./Project.css";

export default function ProjectHeader() {

    const { projectNo } = useParams();

    return (
        <div className="project-header">

            <div className="project-header-main">
                <div className="project-title">
                    프로젝트 제목
                </div>

                <div className="project-description">
                    프로젝트 설명이 표시되는 영역입니다.
                </div>
            </div>

            <div className="project-header-info">
                <div>
                    프로젝트 번호 : {projectNo}
                </div>

                <div>
                    진행중
                </div>
            </div>

        </div>
    );
}