import { Outlet } from "react-router-dom";
import Header from "@templates/Header";
import Sidebar from "./Sidebar";

import "./MainLayout.css";

export default function MainLayout() {


    return (
        <div className="main-layout">

            <Header/>

            <div className="main-body">

                <Sidebar/>

                <div className="main-content">
                    <Outlet/>
                </div>
            </div>
        </div>
    )
}